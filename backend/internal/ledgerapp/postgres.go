package ledgerapp

import (
	"context"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"sort"
	"strings"
	"time"

	"ledger/backend/internal/domain"
	"ledger/backend/internal/platform"
)

type PostgresStore struct {
	db *sql.DB
}

func NewPostgresStore(db *sql.DB) *PostgresStore {
	return &PostgresStore{db: db}
}

func (s *PostgresStore) Migrate(ctx context.Context) error {
	_, err := s.db.ExecContext(ctx, `
CREATE TABLE IF NOT EXISTS categories (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  color TEXT NOT NULL,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  links_to_loan BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (user_id, id)
);

CREATE TABLE IF NOT EXISTS loans (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  name TEXT NOT NULL,
  original_amount NUMERIC NOT NULL CHECK (original_amount >= 0),
  remaining_amount NUMERIC NOT NULL CHECK (remaining_amount >= 0),
  monthly_payment NUMERIC NOT NULL CHECK (monthly_payment >= 0),
  due_day INTEGER NOT NULL CHECK (due_day >= 1 AND due_day <= 31),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id)
);

CREATE TABLE IF NOT EXISTS obligations (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  due_day INTEGER NOT NULL CHECK (due_day >= 1 AND due_day <= 31),
  category_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id)
);

CREATE TABLE IF NOT EXISTS transactions (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  date TEXT NOT NULL,
  category_id TEXT NOT NULL,
  title TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  loan_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id)
);

CREATE INDEX IF NOT EXISTS idx_ledger_transactions_page
ON transactions (user_id, date DESC, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_ledger_transactions_filters
ON transactions (user_id, type, category_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_ledger_loans_page
ON loans (user_id, due_day, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_ledger_categories_page
ON categories (user_id, type, name, id);

CREATE INDEX IF NOT EXISTS idx_ledger_obligations_page
ON obligations (user_id, due_day, created_at DESC, id DESC);
`)
	return err
}

func (s *PostgresStore) ListCategories(ctx context.Context, userID string, options domain.ListOptions) (domain.PagedResponse[domain.Category], error) {
	cursor, err := decodeCursor[categoryCursor](options.Cursor)
	if err != nil {
		return domain.PagedResponse[domain.Category]{}, ErrInvalidCursor
	}

	args := []any{userID}
	query := `
SELECT id, name, type, color, is_system, links_to_loan
FROM categories
WHERE user_id = $1
`
	if cursor != nil {
		args = append(args, cursor.Type, cursor.Name, cursor.ID)
		query += fmt.Sprintf("AND (type, name, id) > ($%d, $%d, $%d)\n", len(args)-2, len(args)-1, len(args))
	}
	args = append(args, options.Limit+1)
	query += fmt.Sprintf("ORDER BY type, name, id LIMIT $%d", len(args))

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return domain.PagedResponse[domain.Category]{}, err
	}
	defer rows.Close()

	categories := make([]domain.Category, 0)
	for rows.Next() {
		var category domain.Category
		category.UserID = userID
		if err := rows.Scan(&category.ID, &category.Name, &category.Type, &category.Color, &category.IsSystem, &category.LinksToLoan); err != nil {
			return domain.PagedResponse[domain.Category]{}, err
		}
		categories = append(categories, category)
	}

	if err := rows.Err(); err != nil {
		return domain.PagedResponse[domain.Category]{}, err
	}

	return pageFromItems(categories, options.Limit, func(category domain.Category) string {
		return encodeCursor(categoryCursor{Type: string(category.Type), Name: category.Name, ID: category.ID})
	}), nil
}

func (s *PostgresStore) CreateCategory(ctx context.Context, userID string, category domain.CreateCategory) (domain.Category, error) {
	created := domain.Category{
		ID:          platform.NewID("cat"),
		UserID:      userID,
		Name:        category.Name,
		Type:        category.Type,
		Color:       category.Color,
		LinksToLoan: category.Type == domain.Expense && category.LinksToLoan,
	}
	err := s.db.QueryRowContext(ctx, `
INSERT INTO categories (user_id, id, name, type, color, links_to_loan)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING id, name, type, color, is_system, links_to_loan
`, userID, created.ID, created.Name, created.Type, created.Color, created.LinksToLoan).Scan(
		&created.ID, &created.Name, &created.Type, &created.Color, &created.IsSystem, &created.LinksToLoan,
	)
	return created, err
}

func (s *PostgresStore) DeleteCategory(ctx context.Context, userID, categoryID string) error {
	result, err := s.db.ExecContext(ctx, `DELETE FROM categories WHERE user_id = $1 AND id = $2`, userID, categoryID)
	if err != nil {
		return err
	}
	if affected, _ := result.RowsAffected(); affected == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *PostgresStore) ListTransactions(ctx context.Context, userID string, filters domain.TransactionFilters) (domain.PagedResponse[domain.LedgerTransaction], error) {
	cursor, err := decodeCursor[transactionCursor](filters.Cursor)
	if err != nil {
		return domain.PagedResponse[domain.LedgerTransaction]{}, ErrInvalidCursor
	}

	args := []any{userID}
	query := `
SELECT id, type, date, category_id, title, amount, COALESCE(loan_id, ''), created_at
FROM transactions
WHERE user_id = $1
`
	if filters.Type != "" {
		args = append(args, filters.Type)
		query += fmt.Sprintf("AND type = $%d\n", len(args))
	}
	if filters.CategoryID != "" {
		args = append(args, filters.CategoryID)
		query += fmt.Sprintf("AND category_id = $%d\n", len(args))
	}
	if filters.StartDate != "" {
		args = append(args, filters.StartDate)
		query += fmt.Sprintf("AND date >= $%d\n", len(args))
	}
	if filters.EndDate != "" {
		args = append(args, filters.EndDate)
		query += fmt.Sprintf("AND date <= $%d\n", len(args))
	}
	if filters.Search != "" {
		args = append(args, "%"+strings.ToLower(filters.Search)+"%")
		query += fmt.Sprintf("AND lower(title) LIKE $%d\n", len(args))
	}
	if cursor != nil {
		args = append(args, cursor.Date, cursor.CreatedAt, cursor.ID)
		query += fmt.Sprintf("AND (date, created_at, id) < ($%d, $%d, $%d)\n", len(args)-2, len(args)-1, len(args))
	}
	args = append(args, normalizedLimit(filters.Limit)+1)
	query += fmt.Sprintf("ORDER BY date DESC, created_at DESC, id DESC LIMIT $%d", len(args))

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return domain.PagedResponse[domain.LedgerTransaction]{}, err
	}
	defer rows.Close()

	transactions := make([]domain.LedgerTransaction, 0)
	createdAtByID := make(map[string]time.Time)
	for rows.Next() {
		var transaction domain.LedgerTransaction
		var createdAt time.Time
		transaction.UserID = userID
		if err := rows.Scan(&transaction.ID, &transaction.Type, &transaction.Date, &transaction.CategoryID, &transaction.Title, &transaction.Amount, &transaction.LoanID, &createdAt); err != nil {
			return domain.PagedResponse[domain.LedgerTransaction]{}, err
		}
		createdAtByID[transaction.ID] = createdAt
		transactions = append(transactions, transaction)
	}

	if err := rows.Err(); err != nil {
		return domain.PagedResponse[domain.LedgerTransaction]{}, err
	}

	limit := normalizedLimit(filters.Limit)
	return pageFromItems(transactions, limit, func(transaction domain.LedgerTransaction) string {
		return encodeCursor(transactionCursor{Date: transaction.Date, CreatedAt: createdAtByID[transaction.ID], ID: transaction.ID})
	}), nil
}

func (s *PostgresStore) CreateTransaction(ctx context.Context, userID string, transaction domain.CreateTransaction) (domain.LedgerTransaction, error) {
	created, err := s.CreateTransactions(ctx, userID, []domain.CreateTransaction{transaction})
	if err != nil {
		return domain.LedgerTransaction{}, err
	}
	return created[0], nil
}

func (s *PostgresStore) CreateTransactions(ctx context.Context, userID string, transactions []domain.CreateTransaction) ([]domain.LedgerTransaction, error) {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	created := make([]domain.LedgerTransaction, 0, len(transactions))
	for _, transaction := range transactions {
		item, err := insertTransaction(ctx, tx, userID, transaction)
		if err != nil {
			return nil, err
		}
		if err := applyLoanPayment(ctx, tx, item); err != nil {
			return nil, err
		}
		created = append(created, item)
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return created, nil
}

func (s *PostgresStore) ListObligations(ctx context.Context, userID string, options domain.ListOptions) (domain.PagedResponse[domain.Obligation], error) {
	cursor, err := decodeCursor[dueDayCursor](options.Cursor)
	if err != nil {
		return domain.PagedResponse[domain.Obligation]{}, ErrInvalidCursor
	}

	args := []any{userID}
	query := `
SELECT id, name, amount, due_day, category_id, created_at
FROM obligations
WHERE user_id = $1
`
	if cursor != nil {
		args = append(args, cursor.DueDay, cursor.CreatedAt, cursor.ID)
		query += fmt.Sprintf("AND (due_day > $%d OR (due_day = $%d AND (created_at, id) < ($%d, $%d)))\n", len(args)-2, len(args)-2, len(args)-1, len(args))
	}
	args = append(args, normalizedLimit(options.Limit)+1)
	query += fmt.Sprintf("ORDER BY due_day, created_at DESC, id DESC LIMIT $%d", len(args))

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return domain.PagedResponse[domain.Obligation]{}, err
	}
	defer rows.Close()

	obligations := make([]domain.Obligation, 0)
	createdAtByID := make(map[string]time.Time)
	for rows.Next() {
		var obligation domain.Obligation
		var createdAt time.Time
		obligation.UserID = userID
		if err := rows.Scan(&obligation.ID, &obligation.Name, &obligation.Amount, &obligation.DueDay, &obligation.CategoryID, &createdAt); err != nil {
			return domain.PagedResponse[domain.Obligation]{}, err
		}
		createdAtByID[obligation.ID] = createdAt
		obligations = append(obligations, obligation)
	}

	if err := rows.Err(); err != nil {
		return domain.PagedResponse[domain.Obligation]{}, err
	}

	limit := normalizedLimit(options.Limit)
	return pageFromItems(obligations, limit, func(obligation domain.Obligation) string {
		return encodeCursor(dueDayCursor{DueDay: obligation.DueDay, CreatedAt: createdAtByID[obligation.ID], ID: obligation.ID})
	}), nil
}

func (s *PostgresStore) CreateObligation(ctx context.Context, userID string, obligation domain.CreateObligation) (domain.Obligation, error) {
	created := domain.Obligation{
		ID:         platform.NewID("obligation"),
		UserID:     userID,
		Name:       obligation.Name,
		Amount:     obligation.Amount,
		DueDay:     obligation.DueDay,
		CategoryID: obligation.CategoryID,
	}
	err := s.db.QueryRowContext(ctx, `
INSERT INTO obligations (user_id, id, name, amount, due_day, category_id)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING id, name, amount, due_day, category_id
`, userID, created.ID, created.Name, created.Amount, created.DueDay, created.CategoryID).Scan(
		&created.ID, &created.Name, &created.Amount, &created.DueDay, &created.CategoryID,
	)
	return created, err
}

func (s *PostgresStore) UpdateObligation(ctx context.Context, userID string, obligation domain.UpdateObligation) (domain.Obligation, error) {
	var updated domain.Obligation
	updated.UserID = userID
	err := s.db.QueryRowContext(ctx, `
UPDATE obligations
SET name = $3,
    amount = $4,
    due_day = $5,
    category_id = $6
WHERE user_id = $1 AND id = $2
RETURNING id, name, amount, due_day, category_id
`, userID, obligation.ID, obligation.Name, obligation.Amount, obligation.DueDay, obligation.CategoryID).Scan(
		&updated.ID, &updated.Name, &updated.Amount, &updated.DueDay, &updated.CategoryID,
	)
	if err != nil {
		return domain.Obligation{}, ErrNotFound
	}
	return updated, nil
}

func (s *PostgresStore) DeleteObligation(ctx context.Context, userID, obligationID string) error {
	result, err := s.db.ExecContext(ctx, `DELETE FROM obligations WHERE user_id = $1 AND id = $2`, userID, obligationID)
	if err != nil {
		return err
	}
	if affected, _ := result.RowsAffected(); affected == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *PostgresStore) ListLoans(ctx context.Context, userID string, options domain.ListOptions) (domain.PagedResponse[domain.Loan], error) {
	cursor, err := decodeCursor[dueDayCursor](options.Cursor)
	if err != nil {
		return domain.PagedResponse[domain.Loan]{}, ErrInvalidCursor
	}

	args := []any{userID}
	query := `
SELECT id, name, original_amount, remaining_amount, monthly_payment, due_day, created_at
FROM loans
WHERE user_id = $1
`
	if cursor != nil {
		args = append(args, cursor.DueDay, cursor.CreatedAt, cursor.ID)
		query += fmt.Sprintf("AND (due_day > $%d OR (due_day = $%d AND (created_at, id) < ($%d, $%d)))\n", len(args)-2, len(args)-2, len(args)-1, len(args))
	}
	args = append(args, normalizedLimit(options.Limit)+1)
	query += fmt.Sprintf("ORDER BY due_day, created_at DESC, id DESC LIMIT $%d", len(args))

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return domain.PagedResponse[domain.Loan]{}, err
	}
	defer rows.Close()

	loans := make([]domain.Loan, 0)
	createdAtByID := make(map[string]time.Time)
	for rows.Next() {
		var loan domain.Loan
		var createdAt time.Time
		loan.UserID = userID
		if err := rows.Scan(&loan.ID, &loan.Name, &loan.OriginalAmount, &loan.RemainingAmount, &loan.MonthlyPayment, &loan.DueDay, &createdAt); err != nil {
			return domain.PagedResponse[domain.Loan]{}, err
		}
		createdAtByID[loan.ID] = createdAt
		loans = append(loans, loan)
	}

	if err := rows.Err(); err != nil {
		return domain.PagedResponse[domain.Loan]{}, err
	}

	limit := normalizedLimit(options.Limit)
	return pageFromItems(loans, limit, func(loan domain.Loan) string {
		return encodeCursor(dueDayCursor{DueDay: loan.DueDay, CreatedAt: createdAtByID[loan.ID], ID: loan.ID})
	}), nil
}

func (s *PostgresStore) CreateLoan(ctx context.Context, userID string, loan domain.CreateLoan) (domain.Loan, error) {
	remaining := loan.RemainingAmount
	if remaining == 0 {
		remaining = loan.OriginalAmount
	}

	created := domain.Loan{
		ID:              platform.NewID("loan"),
		UserID:          userID,
		Name:            loan.Name,
		OriginalAmount:  loan.OriginalAmount,
		RemainingAmount: math.Min(remaining, loan.OriginalAmount),
		MonthlyPayment:  loan.MonthlyPayment,
		DueDay:          loan.DueDay,
	}
	err := s.db.QueryRowContext(ctx, `
INSERT INTO loans (user_id, id, name, original_amount, remaining_amount, monthly_payment, due_day)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING id, name, original_amount, remaining_amount, monthly_payment, due_day
`, userID, created.ID, created.Name, created.OriginalAmount, created.RemainingAmount, created.MonthlyPayment, created.DueDay).Scan(
		&created.ID, &created.Name, &created.OriginalAmount, &created.RemainingAmount, &created.MonthlyPayment, &created.DueDay,
	)
	return created, err
}

func (s *PostgresStore) UpdateLoan(ctx context.Context, userID string, loan domain.UpdateLoan) (domain.Loan, error) {
	remaining := math.Min(loan.RemainingAmount, loan.OriginalAmount)
	var updated domain.Loan
	updated.UserID = userID
	err := s.db.QueryRowContext(ctx, `
UPDATE loans
SET name = $3,
    original_amount = $4,
    remaining_amount = $5,
    monthly_payment = $6,
    due_day = $7
WHERE user_id = $1 AND id = $2
RETURNING id, name, original_amount, remaining_amount, monthly_payment, due_day
`, userID, loan.ID, loan.Name, loan.OriginalAmount, remaining, loan.MonthlyPayment, loan.DueDay).Scan(
		&updated.ID, &updated.Name, &updated.OriginalAmount, &updated.RemainingAmount, &updated.MonthlyPayment, &updated.DueDay,
	)
	if err != nil {
		return domain.Loan{}, ErrNotFound
	}
	return updated, nil
}

func (s *PostgresStore) DeleteLoan(ctx context.Context, userID, loanID string) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err := tx.ExecContext(ctx, `UPDATE transactions SET loan_id = NULL WHERE user_id = $1 AND loan_id = $2`, userID, loanID); err != nil {
		return err
	}

	result, err := tx.ExecContext(ctx, `DELETE FROM loans WHERE user_id = $1 AND id = $2`, userID, loanID)
	if err != nil {
		return err
	}
	if affected, _ := result.RowsAffected(); affected == 0 {
		return ErrNotFound
	}

	return tx.Commit()
}

func (s *PostgresStore) DashboardSummary(ctx context.Context, userID string, month string) (domain.DashboardSummary, error) {
	categories, err := s.listAllCategories(ctx, userID)
	if err != nil {
		return domain.DashboardSummary{}, err
	}
	transactions, err := s.listAllTransactions(ctx, userID)
	if err != nil {
		return domain.DashboardSummary{}, err
	}
	loans, err := s.listAllLoans(ctx, userID)
	if err != nil {
		return domain.DashboardSummary{}, err
	}
	obligations, err := s.listAllObligations(ctx, userID)
	if err != nil {
		return domain.DashboardSummary{}, err
	}

	monthIncome := 0.0
	monthExpense := 0.0
	monthTransactions := make([]domain.LedgerTransaction, 0)
	for _, transaction := range transactions {
		if !strings.HasPrefix(transaction.Date, month) {
			continue
		}
		monthTransactions = append(monthTransactions, transaction)
		if transaction.Type == domain.Income {
			monthIncome += transaction.Amount
		} else {
			monthExpense += transaction.Amount
		}
	}

	activeLoans := make([]domain.Loan, 0)
	loanDebt := 0.0
	for _, loan := range loans {
		loanDebt += loan.RemainingAmount
		if loan.RemainingAmount > 0 {
			activeLoans = append(activeLoans, loan)
		}
	}

	sort.Slice(activeLoans, func(i, j int) bool {
		if activeLoans[i].DueDay == activeLoans[j].DueDay {
			return activeLoans[i].Name < activeLoans[j].Name
		}
		return activeLoans[i].DueDay < activeLoans[j].DueDay
	})

	upcoming := make([]domain.UpcomingObligation, 0, len(activeLoans)+len(obligations))
	for _, loan := range activeLoans {
		upcoming = append(upcoming, domain.UpcomingObligation{
			ID:     loan.ID,
			Name:   loan.Name,
			Amount: math.Min(loan.MonthlyPayment, loan.RemainingAmount),
			DueDay: loan.DueDay,
			Source: "loan",
		})
	}
	for _, obligation := range obligations {
		upcoming = append(upcoming, domain.UpcomingObligation{
			ID:         obligation.ID,
			Name:       obligation.Name,
			Amount:     obligation.Amount,
			DueDay:     obligation.DueDay,
			CategoryID: obligation.CategoryID,
			Source:     "custom",
		})
	}
	sort.Slice(upcoming, func(i, j int) bool {
		if upcoming[i].DueDay == upcoming[j].DueDay {
			return upcoming[i].Name < upcoming[j].Name
		}
		return upcoming[i].DueDay < upcoming[j].DueDay
	})

	recent := append([]domain.LedgerTransaction(nil), transactions...)
	if len(recent) > 6 {
		recent = recent[:6]
	}

	return domain.DashboardSummary{
		Month:               month,
		MonthIncome:         monthIncome,
		MonthExpense:        monthExpense,
		MonthBalance:        monthIncome - monthExpense,
		LoanDebt:            loanDebt,
		ExpenseBreakdown:    buildCategoryBreakdown(monthTransactions, domain.Expense, categories),
		ActiveLoans:         activeLoans,
		UpcomingObligations: upcoming,
		RecentTransactions:  recent,
	}, nil
}

func (s *PostgresStore) StatisticsSummary(ctx context.Context, userID string, months int) (domain.StatisticsSummary, error) {
	categories, err := s.listAllCategories(ctx, userID)
	if err != nil {
		return domain.StatisticsSummary{}, err
	}
	transactions, err := s.listAllTransactions(ctx, userID)
	if err != nil {
		return domain.StatisticsSummary{}, err
	}
	loans, err := s.listAllLoans(ctx, userID)
	if err != nil {
		return domain.StatisticsSummary{}, err
	}

	totalIncome := 0.0
	totalExpense := 0.0
	totalAmount := 0.0
	activeDays := map[string]struct{}{}
	firstDate := ""
	weekdays := []domain.WeekdayStat{
		{Weekday: 0}, {Weekday: 1}, {Weekday: 2}, {Weekday: 3}, {Weekday: 4}, {Weekday: 5}, {Weekday: 6},
	}

	for _, transaction := range transactions {
		totalAmount += transaction.Amount
		activeDays[transaction.Date] = struct{}{}
		if firstDate == "" || transaction.Date < firstDate {
			firstDate = transaction.Date
		}
		if transaction.Type == domain.Income {
			totalIncome += transaction.Amount
			continue
		}
		totalExpense += transaction.Amount
		weekday := normalizedWeekday(transaction.Date)
		weekdays[weekday].Amount += transaction.Amount
		weekdays[weekday].Count++
	}

	monthStats := recentMonthStats(months)
	monthIndex := make(map[string]int, len(monthStats))
	for index, month := range monthStats {
		monthIndex[month.Key] = index
	}
	for _, transaction := range transactions {
		key := transaction.Date
		if len(key) >= 7 {
			key = key[:7]
		}
		index, ok := monthIndex[key]
		if !ok {
			continue
		}
		if transaction.Type == domain.Income {
			monthStats[index].Income += transaction.Amount
		} else {
			monthStats[index].Expense += transaction.Amount
		}
		monthStats[index].Balance = monthStats[index].Income - monthStats[index].Expense
	}

	monthlyDebtPressure := 0.0
	originalDebt := 0.0
	remainingDebt := 0.0
	maxPayment := 1.0
	for _, loan := range loans {
		monthlyDebtPressure += loan.MonthlyPayment
		originalDebt += loan.OriginalAmount
		remainingDebt += loan.RemainingAmount
		maxPayment = math.Max(maxPayment, loan.MonthlyPayment)
	}
	loanStats := make([]domain.LoanStat, 0, len(loans))
	for _, loan := range loans {
		paid := math.Max(0, loan.OriginalAmount-loan.RemainingAmount)
		loanStats = append(loanStats, domain.LoanStat{
			Loan:          loan,
			Paid:          paid,
			PaidShare:     percentOf(paid, loan.OriginalAmount),
			PressureShare: percentOf(loan.MonthlyPayment, maxPayment),
		})
	}

	topExpenses := make([]domain.TopTransaction, 0)
	for _, transaction := range transactions {
		if transaction.Type != domain.Expense {
			continue
		}
		category := categoryByID(categories, transaction.CategoryID)
		topExpenses = append(topExpenses, domain.TopTransaction{
			Transaction:   transaction,
			CategoryName:  category.Name,
			CategoryColor: category.Color,
		})
	}
	sort.Slice(topExpenses, func(i, j int) bool {
		return topExpenses[i].Transaction.Amount > topExpenses[j].Transaction.Amount
	})
	if len(topExpenses) > 6 {
		topExpenses = topExpenses[:6]
	}

	netBalance := totalIncome - totalExpense
	averageDailyExpense := 0.0
	if firstDate != "" {
		averageDailyExpense = totalExpense / float64(daysBetween(firstDate, time.Now().Format("2006-01-02")))
	}
	averageTransaction := 0.0
	if len(transactions) > 0 {
		averageTransaction = totalAmount / float64(len(transactions))
	}

	return domain.StatisticsSummary{
		TotalIncome:          totalIncome,
		TotalExpense:         totalExpense,
		NetBalance:           netBalance,
		SavingsRate:          percentOf(netBalance, totalIncome),
		FirstTransactionDate: firstDate,
		ActiveDays:           len(activeDays),
		AverageDailyExpense:  averageDailyExpense,
		AverageTransaction:   averageTransaction,
		MonthlyDebtPressure:  monthlyDebtPressure,
		LoanPayoffShare:      percentOf(originalDebt-remainingDebt, originalDebt),
		MonthStats:           monthStats,
		ExpenseCategories:    buildCategoryBreakdown(transactions, domain.Expense, categories),
		IncomeCategories:     buildCategoryBreakdown(transactions, domain.Income, categories),
		Weekdays:             weekdays,
		LoanStats:            loanStats,
		TopExpenses:          topExpenses,
	}, nil
}

type txExecutor interface {
	QueryRowContext(context.Context, string, ...any) *sql.Row
	ExecContext(context.Context, string, ...any) (sql.Result, error)
}

func insertTransaction(ctx context.Context, tx txExecutor, userID string, transaction domain.CreateTransaction) (domain.LedgerTransaction, error) {
	created := domain.LedgerTransaction{
		ID:         platform.NewID("tx"),
		UserID:     userID,
		Type:       transaction.Type,
		Date:       transaction.Date,
		CategoryID: transaction.CategoryID,
		Title:      transaction.Title,
		Amount:     transaction.Amount,
		LoanID:     transaction.LoanID,
	}

	loanID := sql.NullString{String: created.LoanID, Valid: created.LoanID != ""}
	err := tx.QueryRowContext(ctx, `
INSERT INTO transactions (user_id, id, type, date, category_id, title, amount, loan_id)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING id, type, date, category_id, title, amount, COALESCE(loan_id, '')
`, userID, created.ID, created.Type, created.Date, created.CategoryID, created.Title, created.Amount, loanID).Scan(
		&created.ID, &created.Type, &created.Date, &created.CategoryID, &created.Title, &created.Amount, &created.LoanID,
	)
	if err != nil {
		return domain.LedgerTransaction{}, err
	}

	return created, nil
}

func applyLoanPayment(ctx context.Context, tx txExecutor, transaction domain.LedgerTransaction) error {
	if transaction.Type != domain.Expense || transaction.LoanID == "" {
		return nil
	}

	result, err := tx.ExecContext(ctx, `
UPDATE loans
SET remaining_amount = GREATEST(0, remaining_amount - $3)
WHERE user_id = $1 AND id = $2
`, transaction.UserID, transaction.LoanID, transaction.Amount)
	if err != nil {
		return err
	}
	if affected, _ := result.RowsAffected(); affected == 0 {
		return errors.New("linked loan was not found")
	}

	return nil
}

type categoryCursor struct {
	Type string `json:"type"`
	Name string `json:"name"`
	ID   string `json:"id"`
}

type transactionCursor struct {
	Date      string    `json:"date"`
	CreatedAt time.Time `json:"createdAt"`
	ID        string    `json:"id"`
}

type dueDayCursor struct {
	DueDay    int       `json:"dueDay"`
	CreatedAt time.Time `json:"createdAt"`
	ID        string    `json:"id"`
}

func normalizedLimit(limit int) int {
	if limit < 1 {
		return 30
	}
	if limit > 100 {
		return 100
	}
	return limit
}

func pageFromItems[T any](items []T, limit int, cursorFor func(T) string) domain.PagedResponse[T] {
	limit = normalizedLimit(limit)
	hasMore := len(items) > limit
	if hasMore {
		items = items[:limit]
	}
	nextCursor := ""
	if hasMore && len(items) > 0 {
		nextCursor = cursorFor(items[len(items)-1])
	}
	return domain.PagedResponse[T]{Items: items, NextCursor: nextCursor, HasMore: hasMore}
}

func encodeCursor(value any) string {
	raw, _ := json.Marshal(value)
	return base64.RawURLEncoding.EncodeToString(raw)
}

func decodeCursor[T any](cursor string) (*T, error) {
	if strings.TrimSpace(cursor) == "" {
		return nil, nil
	}
	raw, err := base64.RawURLEncoding.DecodeString(cursor)
	if err != nil {
		return nil, err
	}
	var value T
	if err := json.Unmarshal(raw, &value); err != nil {
		return nil, err
	}
	return &value, nil
}

func (s *PostgresStore) listAllCategories(ctx context.Context, userID string) ([]domain.Category, error) {
	rows, err := s.db.QueryContext(ctx, `
SELECT id, name, type, color, is_system, links_to_loan
FROM categories
WHERE user_id = $1
ORDER BY type, name, id
`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	categories := make([]domain.Category, 0)
	for rows.Next() {
		var category domain.Category
		category.UserID = userID
		if err := rows.Scan(&category.ID, &category.Name, &category.Type, &category.Color, &category.IsSystem, &category.LinksToLoan); err != nil {
			return nil, err
		}
		categories = append(categories, category)
	}
	return categories, rows.Err()
}

func (s *PostgresStore) listAllTransactions(ctx context.Context, userID string) ([]domain.LedgerTransaction, error) {
	rows, err := s.db.QueryContext(ctx, `
SELECT id, type, date, category_id, title, amount, COALESCE(loan_id, '')
FROM transactions
WHERE user_id = $1
ORDER BY date DESC, created_at DESC, id DESC
`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	transactions := make([]domain.LedgerTransaction, 0)
	for rows.Next() {
		var transaction domain.LedgerTransaction
		transaction.UserID = userID
		if err := rows.Scan(&transaction.ID, &transaction.Type, &transaction.Date, &transaction.CategoryID, &transaction.Title, &transaction.Amount, &transaction.LoanID); err != nil {
			return nil, err
		}
		transactions = append(transactions, transaction)
	}
	return transactions, rows.Err()
}

func (s *PostgresStore) listAllLoans(ctx context.Context, userID string) ([]domain.Loan, error) {
	rows, err := s.db.QueryContext(ctx, `
SELECT id, name, original_amount, remaining_amount, monthly_payment, due_day
FROM loans
WHERE user_id = $1
ORDER BY due_day, created_at DESC, id DESC
`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	loans := make([]domain.Loan, 0)
	for rows.Next() {
		var loan domain.Loan
		loan.UserID = userID
		if err := rows.Scan(&loan.ID, &loan.Name, &loan.OriginalAmount, &loan.RemainingAmount, &loan.MonthlyPayment, &loan.DueDay); err != nil {
			return nil, err
		}
		loans = append(loans, loan)
	}
	return loans, rows.Err()
}

func (s *PostgresStore) listAllObligations(ctx context.Context, userID string) ([]domain.Obligation, error) {
	rows, err := s.db.QueryContext(ctx, `
SELECT id, name, amount, due_day, category_id
FROM obligations
WHERE user_id = $1
ORDER BY due_day, created_at DESC, id DESC
`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	obligations := make([]domain.Obligation, 0)
	for rows.Next() {
		var obligation domain.Obligation
		obligation.UserID = userID
		if err := rows.Scan(&obligation.ID, &obligation.Name, &obligation.Amount, &obligation.DueDay, &obligation.CategoryID); err != nil {
			return nil, err
		}
		obligations = append(obligations, obligation)
	}
	return obligations, rows.Err()
}

func buildCategoryBreakdown(transactions []domain.LedgerTransaction, transactionType domain.TransactionType, categories []domain.Category) []domain.CategoryBreakdown {
	values := make(map[string]domain.CategoryBreakdown)
	total := 0.0
	for _, transaction := range transactions {
		if transaction.Type != transactionType {
			continue
		}
		category := categoryByID(categories, transaction.CategoryID)
		current := values[category.ID]
		current.Category = category
		current.Amount += transaction.Amount
		current.Transactions++
		values[category.ID] = current
		total += transaction.Amount
	}

	breakdown := make([]domain.CategoryBreakdown, 0, len(values))
	for _, value := range values {
		value.Share = percentOf(value.Amount, total)
		breakdown = append(breakdown, value)
	}
	sort.Slice(breakdown, func(i, j int) bool {
		return breakdown[i].Amount > breakdown[j].Amount
	})
	return breakdown
}

func categoryByID(categories []domain.Category, categoryID string) domain.Category {
	for _, category := range categories {
		if category.ID == categoryID {
			return category
		}
	}
	return domain.Category{ID: "unknown", Name: "Unknown", Type: domain.Expense, Color: "#5f6368"}
}

func recentMonthStats(count int) []domain.MonthStat {
	now := time.Now()
	stats := make([]domain.MonthStat, 0, count)
	for index := 0; index < count; index++ {
		date := time.Date(now.Year(), now.Month()-time.Month(count-index-1), 1, 0, 0, 0, 0, now.Location())
		stats = append(stats, domain.MonthStat{Key: date.Format("2006-01")})
	}
	return stats
}

func normalizedWeekday(date string) int {
	parsed, err := time.Parse("2006-01-02", date)
	if err != nil {
		return 0
	}
	weekday := int(parsed.Weekday())
	if weekday == 0 {
		return 6
	}
	return weekday - 1
}

func percentOf(value float64, total float64) int {
	if total <= 0 {
		return 0
	}
	percent := (value / total) * 100
	if percent < 0 {
		percent = 0
	}
	if percent > 100 {
		percent = 100
	}
	return int(math.Round(percent))
}

func daysBetween(start string, end string) int {
	startDate, err := time.Parse("2006-01-02", start)
	if err != nil {
		return 1
	}
	endDate, err := time.Parse("2006-01-02", end)
	if err != nil {
		return 1
	}
	days := int(math.Ceil(endDate.Sub(startDate).Hours()/24)) + 1
	if days < 1 {
		return 1
	}
	return days
}
