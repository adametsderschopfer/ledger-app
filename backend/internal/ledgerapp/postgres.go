package ledgerapp

import (
	"context"
	"database/sql"
	"errors"
	"math"

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
`)
	return err
}

func (s *PostgresStore) ListCategories(ctx context.Context, userID string) ([]domain.Category, error) {
	rows, err := s.db.QueryContext(ctx, `
SELECT id, name, type, color, is_system, links_to_loan
FROM categories
WHERE user_id = $1
ORDER BY type, name
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

func (s *PostgresStore) ListTransactions(ctx context.Context, userID string) ([]domain.LedgerTransaction, error) {
	rows, err := s.db.QueryContext(ctx, `
SELECT id, type, date, category_id, title, amount, COALESCE(loan_id, '')
FROM transactions
WHERE user_id = $1
ORDER BY date DESC, created_at DESC
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

func (s *PostgresStore) ListObligations(ctx context.Context, userID string) ([]domain.Obligation, error) {
	rows, err := s.db.QueryContext(ctx, `
SELECT id, name, amount, due_day, category_id
FROM obligations
WHERE user_id = $1
ORDER BY due_day, created_at DESC
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

func (s *PostgresStore) ListLoans(ctx context.Context, userID string) ([]domain.Loan, error) {
	rows, err := s.db.QueryContext(ctx, `
SELECT id, name, original_amount, remaining_amount, monthly_payment, due_day
FROM loans
WHERE user_id = $1
ORDER BY due_day, created_at DESC
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
