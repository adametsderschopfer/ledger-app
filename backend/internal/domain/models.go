package domain

import "strings"

type TransactionType string

const (
	Income  TransactionType = "income"
	Expense TransactionType = "expense"
)

type UserRole string

const (
	RoleUser  UserRole = "user"
	RoleAdmin UserRole = "admin"
)

type AppLanguage string

const (
	LanguageRU AppLanguage = "RU"
	LanguageEN AppLanguage = "EN"
)

var SupportedLanguages = []AppLanguage{LanguageRU, LanguageEN}

type User struct {
	ID        string   `json:"id"`
	Name      string   `json:"name"`
	Email     string   `json:"email"`
	AvatarURL string   `json:"avatarUrl,omitempty"`
	Password  string   `json:"password,omitempty"`
	Role      UserRole `json:"role"`
	IsActive  bool     `json:"isActive"`
}

type LoginCredentials struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type CreateUser struct {
	Name     string   `json:"name"`
	Email    string   `json:"email"`
	Password string   `json:"password"`
	Role     UserRole `json:"role"`
}

type UpdateProfile struct {
	Name      string `json:"name"`
	Email     string `json:"email"`
	AvatarURL string `json:"avatarUrl"`
}

type UpdatePassword struct {
	CurrentPassword string `json:"currentPassword"`
	NewPassword     string `json:"newPassword"`
}

type AuthSession struct {
	User  User   `json:"user"`
	Token string `json:"token"`
}

type AppConfig struct {
	Language           AppLanguage   `json:"language"`
	SupportedLanguages []AppLanguage `json:"supportedLanguages"`
}

type Category struct {
	ID          string          `json:"id"`
	UserID      string          `json:"-"`
	Name        string          `json:"name"`
	Type        TransactionType `json:"type"`
	Color       string          `json:"color"`
	IsSystem    bool            `json:"isSystem"`
	LinksToLoan bool            `json:"linksToLoan,omitempty"`
}

type CreateCategory struct {
	Name        string          `json:"name"`
	Type        TransactionType `json:"type"`
	Color       string          `json:"color"`
	LinksToLoan bool            `json:"linksToLoan,omitempty"`
}

type LedgerTransaction struct {
	ID         string          `json:"id"`
	UserID     string          `json:"-"`
	Type       TransactionType `json:"type"`
	Date       string          `json:"date"`
	CategoryID string          `json:"categoryId"`
	Title      string          `json:"title"`
	Amount     float64         `json:"amount"`
	LoanID     string          `json:"loanId,omitempty"`
}

type CreateTransaction struct {
	Type       TransactionType `json:"type"`
	Date       string          `json:"date"`
	CategoryID string          `json:"categoryId"`
	Title      string          `json:"title"`
	Amount     float64         `json:"amount"`
	LoanID     string          `json:"loanId,omitempty"`
}

type BatchTransactions struct {
	Transactions []CreateTransaction `json:"transactions"`
}

type PagedResponse[T any] struct {
	Items      []T    `json:"items"`
	NextCursor string `json:"nextCursor,omitempty"`
	HasMore    bool   `json:"hasMore"`
}

type ListOptions struct {
	Limit  int
	Cursor string
}

type TransactionFilters struct {
	ListOptions
	Type       TransactionType
	CategoryID string
	StartDate  string
	EndDate    string
	Search     string
}

type Loan struct {
	ID              string  `json:"id"`
	UserID          string  `json:"-"`
	Name            string  `json:"name"`
	OriginalAmount  float64 `json:"originalAmount"`
	RemainingAmount float64 `json:"remainingAmount"`
	MonthlyPayment  float64 `json:"monthlyPayment"`
	DueDay          int     `json:"dueDay"`
}

type Obligation struct {
	ID         string  `json:"id"`
	UserID     string  `json:"-"`
	Name       string  `json:"name"`
	Amount     float64 `json:"amount"`
	DueDay     int     `json:"dueDay"`
	CategoryID string  `json:"categoryId"`
}

type CreateObligation struct {
	Name       string  `json:"name"`
	Amount     float64 `json:"amount"`
	DueDay     int     `json:"dueDay"`
	CategoryID string  `json:"categoryId"`
}

type UpdateObligation struct {
	ID         string  `json:"id"`
	Name       string  `json:"name"`
	Amount     float64 `json:"amount"`
	DueDay     int     `json:"dueDay"`
	CategoryID string  `json:"categoryId"`
}

type CreateLoan struct {
	Name            string  `json:"name"`
	OriginalAmount  float64 `json:"originalAmount"`
	RemainingAmount float64 `json:"remainingAmount,omitempty"`
	MonthlyPayment  float64 `json:"monthlyPayment"`
	DueDay          int     `json:"dueDay"`
}

type UpdateLoan struct {
	ID              string  `json:"id"`
	Name            string  `json:"name"`
	OriginalAmount  float64 `json:"originalAmount"`
	RemainingAmount float64 `json:"remainingAmount,omitempty"`
	MonthlyPayment  float64 `json:"monthlyPayment"`
	DueDay          int     `json:"dueDay"`
}

type CategoryBreakdown struct {
	Category     Category `json:"category"`
	Amount       float64  `json:"amount"`
	Share        int      `json:"share"`
	Transactions int      `json:"transactions"`
}

type UpcomingObligation struct {
	ID         string  `json:"id"`
	Name       string  `json:"name"`
	Amount     float64 `json:"amount"`
	DueDay     int     `json:"dueDay"`
	Source     string  `json:"source"`
	CategoryID string  `json:"categoryId,omitempty"`
}

type DashboardSummary struct {
	Month               string               `json:"month"`
	MonthIncome         float64              `json:"monthIncome"`
	MonthExpense        float64              `json:"monthExpense"`
	MonthBalance        float64              `json:"monthBalance"`
	LoanDebt            float64              `json:"loanDebt"`
	ExpenseBreakdown    []CategoryBreakdown  `json:"expenseBreakdown"`
	ActiveLoans         []Loan               `json:"activeLoans"`
	UpcomingObligations []UpcomingObligation `json:"upcomingObligations"`
	RecentTransactions  []LedgerTransaction  `json:"recentTransactions"`
}

type MonthStat struct {
	Key     string  `json:"key"`
	Income  float64 `json:"income"`
	Expense float64 `json:"expense"`
	Balance float64 `json:"balance"`
}

type WeekdayStat struct {
	Weekday int     `json:"weekday"`
	Amount  float64 `json:"amount"`
	Count   int     `json:"count"`
}

type LoanStat struct {
	Loan          Loan    `json:"loan"`
	Paid          float64 `json:"paid"`
	PaidShare     int     `json:"paidShare"`
	PressureShare int     `json:"pressureShare"`
}

type TopTransaction struct {
	Transaction   LedgerTransaction `json:"transaction"`
	CategoryName  string            `json:"categoryName"`
	CategoryColor string            `json:"categoryColor"`
}

type StatisticsSummary struct {
	TotalIncome          float64             `json:"totalIncome"`
	TotalExpense         float64             `json:"totalExpense"`
	NetBalance           float64             `json:"netBalance"`
	SavingsRate          int                 `json:"savingsRate"`
	FirstTransactionDate string              `json:"firstTransactionDate"`
	ActiveDays           int                 `json:"activeDays"`
	AverageDailyExpense  float64             `json:"averageDailyExpense"`
	AverageTransaction   float64             `json:"averageTransaction"`
	MonthlyDebtPressure  float64             `json:"monthlyDebtPressure"`
	LoanPayoffShare      int                 `json:"loanPayoffShare"`
	MonthStats           []MonthStat         `json:"monthStats"`
	ExpenseCategories    []CategoryBreakdown `json:"expenseCategories"`
	IncomeCategories     []CategoryBreakdown `json:"incomeCategories"`
	Weekdays             []WeekdayStat       `json:"weekdays"`
	LoanStats            []LoanStat          `json:"loanStats"`
	TopExpenses          []TopTransaction    `json:"topExpenses"`
}

func NormalizeLanguage(language string) AppLanguage {
	if strings.EqualFold(strings.TrimSpace(language), string(LanguageEN)) {
		return LanguageEN
	}
	return LanguageRU
}

func DefaultCategories(userID string, languages ...AppLanguage) []Category {
	language := LanguageRU
	if len(languages) > 0 {
		language = NormalizeLanguage(string(languages[0]))
	}

	names := defaultCategoryNamesRU
	if language == LanguageEN {
		names = defaultCategoryNamesEN
	}

	return []Category{
		{ID: "salary", UserID: userID, Name: names["salary"], Type: Income, Color: "#1a73e8"},
		{ID: "freelance", UserID: userID, Name: names["freelance"], Type: Income, Color: "#34a853"},
		{ID: "interest", UserID: userID, Name: names["interest"], Type: Income, Color: "#fbbc04"},
		{ID: "bonus", UserID: userID, Name: names["bonus"], Type: Income, Color: "#188038"},
		{ID: "investments", UserID: userID, Name: names["investments"], Type: Income, Color: "#f9ab00"},
		{ID: "groceries", UserID: userID, Name: names["groceries"], Type: Expense, Color: "#d93025"},
		{ID: "transport", UserID: userID, Name: names["transport"], Type: Expense, Color: "#1a73e8"},
		{ID: "home", UserID: userID, Name: names["home"], Type: Expense, Color: "#188038"},
		{ID: "utilities", UserID: userID, Name: names["utilities"], Type: Expense, Color: "#f9ab00"},
		{ID: "health", UserID: userID, Name: names["health"], Type: Expense, Color: "#a142f4"},
		{ID: "education", UserID: userID, Name: names["education"], Type: Expense, Color: "#1a73e8"},
		{ID: "entertainment", UserID: userID, Name: names["entertainment"], Type: Expense, Color: "#fa7b17"},
		{ID: "credit-payments", UserID: userID, Name: names["credit-payments"], Type: Expense, Color: "#a142f4", LinksToLoan: true},
	}
}

var defaultCategoryNamesRU = map[string]string{
	"salary":          "Зарплата",
	"freelance":       "Фриланс",
	"interest":        "Проценты",
	"bonus":           "Бонусы",
	"investments":     "Инвестиции",
	"groceries":       "Продукты",
	"transport":       "Транспорт",
	"home":            "Дом",
	"utilities":       "Коммунальные услуги",
	"health":          "Здоровье",
	"education":       "Обучение",
	"entertainment":   "Досуг",
	"credit-payments": "Платежи по кредитам",
}

var defaultCategoryNamesEN = map[string]string{
	"salary":          "Salary",
	"freelance":       "Freelance",
	"interest":        "Interest",
	"bonus":           "Bonuses",
	"investments":     "Investments",
	"groceries":       "Groceries",
	"transport":       "Transport",
	"home":            "Home",
	"utilities":       "Utilities",
	"health":          "Health",
	"education":       "Education",
	"entertainment":   "Entertainment",
	"credit-payments": "Loan payments",
}
