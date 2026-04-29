package domain

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

type User struct {
	ID       string   `json:"id"`
	Name     string   `json:"name"`
	Email    string   `json:"email"`
	Password string   `json:"password,omitempty"`
	Role     UserRole `json:"role"`
	IsActive bool     `json:"isActive"`
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

type AuthSession struct {
	User  User   `json:"user"`
	Token string `json:"token"`
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

type Loan struct {
	ID              string  `json:"id"`
	UserID          string  `json:"-"`
	Name            string  `json:"name"`
	OriginalAmount  float64 `json:"originalAmount"`
	RemainingAmount float64 `json:"remainingAmount"`
	MonthlyPayment  float64 `json:"monthlyPayment"`
	DueDay          int     `json:"dueDay"`
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

func DefaultCategories(userID string) []Category {
	return []Category{
		{ID: "salary", UserID: userID, Name: "Salary", Type: Income, Color: "#1a73e8"},
		{ID: "freelance", UserID: userID, Name: "Freelance", Type: Income, Color: "#34a853"},
		{ID: "interest", UserID: userID, Name: "Interest", Type: Income, Color: "#fbbc04"},
		{ID: "bonus", UserID: userID, Name: "Bonus", Type: Income, Color: "#188038"},
		{ID: "investments", UserID: userID, Name: "Investments", Type: Income, Color: "#f9ab00"},
		{ID: "groceries", UserID: userID, Name: "Groceries", Type: Expense, Color: "#d93025"},
		{ID: "transport", UserID: userID, Name: "Transport", Type: Expense, Color: "#1a73e8"},
		{ID: "home", UserID: userID, Name: "Home", Type: Expense, Color: "#188038"},
		{ID: "utilities", UserID: userID, Name: "Utilities", Type: Expense, Color: "#f9ab00"},
		{ID: "health", UserID: userID, Name: "Health", Type: Expense, Color: "#a142f4"},
		{ID: "education", UserID: userID, Name: "Education", Type: Expense, Color: "#1a73e8"},
		{ID: "entertainment", UserID: userID, Name: "Entertainment", Type: Expense, Color: "#fa7b17"},
		{ID: "credit-payments", UserID: userID, Name: "Loan payments", Type: Expense, Color: "#a142f4", LinksToLoan: true},
	}
}
