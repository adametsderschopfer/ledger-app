package ledgerapp

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"ledger/backend/internal/domain"
)

type fakeAuthenticator struct{}

func (fakeAuthenticator) Authenticate(context.Context, string) (domain.User, error) {
	return domain.User{ID: "user-1", Name: "User", Email: "owner@ledger.local", Role: domain.RoleUser, IsActive: true}, nil
}

type fakeLedgerStore struct {
	transactions []domain.LedgerTransaction
	obligations  []domain.Obligation
	remaining    float64
}

func (s *fakeLedgerStore) ListCategories(context.Context, string, domain.ListOptions) (domain.PagedResponse[domain.Category], error) {
	return domain.PagedResponse[domain.Category]{Items: domain.DefaultCategories("user-1")}, nil
}
func (s *fakeLedgerStore) CreateCategory(_ context.Context, userID string, category domain.CreateCategory) (domain.Category, error) {
	return domain.Category{ID: "cat-1", UserID: userID, Name: category.Name, Type: category.Type, Color: category.Color}, nil
}
func (s *fakeLedgerStore) DeleteCategory(context.Context, string, string) error { return nil }
func (s *fakeLedgerStore) ListTransactions(context.Context, string, domain.TransactionFilters) (domain.PagedResponse[domain.LedgerTransaction], error) {
	return domain.PagedResponse[domain.LedgerTransaction]{Items: s.transactions}, nil
}
func (s *fakeLedgerStore) CreateTransaction(_ context.Context, userID string, transaction domain.CreateTransaction) (domain.LedgerTransaction, error) {
	created := domain.LedgerTransaction{ID: "tx-1", UserID: userID, Type: transaction.Type, Date: transaction.Date, CategoryID: transaction.CategoryID, Title: transaction.Title, Amount: transaction.Amount, LoanID: transaction.LoanID}
	s.transactions = append([]domain.LedgerTransaction{created}, s.transactions...)
	if created.LoanID != "" {
		s.remaining -= created.Amount
	}
	return created, nil
}
func (s *fakeLedgerStore) CreateTransactions(ctx context.Context, userID string, transactions []domain.CreateTransaction) ([]domain.LedgerTransaction, error) {
	created := make([]domain.LedgerTransaction, 0, len(transactions))
	for _, transaction := range transactions {
		item, err := s.CreateTransaction(ctx, userID, transaction)
		if err != nil {
			return nil, err
		}
		created = append(created, item)
	}
	return created, nil
}
func (s *fakeLedgerStore) ListObligations(context.Context, string, domain.ListOptions) (domain.PagedResponse[domain.Obligation], error) {
	return domain.PagedResponse[domain.Obligation]{Items: s.obligations}, nil
}
func (s *fakeLedgerStore) CreateObligation(_ context.Context, userID string, obligation domain.CreateObligation) (domain.Obligation, error) {
	created := domain.Obligation{ID: "obligation-1", UserID: userID, Name: obligation.Name, Amount: obligation.Amount, DueDay: obligation.DueDay, CategoryID: obligation.CategoryID}
	s.obligations = append([]domain.Obligation{created}, s.obligations...)
	return created, nil
}
func (s *fakeLedgerStore) UpdateObligation(_ context.Context, userID string, obligation domain.UpdateObligation) (domain.Obligation, error) {
	return domain.Obligation{ID: obligation.ID, UserID: userID, Name: obligation.Name, Amount: obligation.Amount, DueDay: obligation.DueDay, CategoryID: obligation.CategoryID}, nil
}
func (s *fakeLedgerStore) DeleteObligation(context.Context, string, string) error { return nil }
func (s *fakeLedgerStore) ListLoans(context.Context, string, domain.ListOptions) (domain.PagedResponse[domain.Loan], error) {
	return domain.PagedResponse[domain.Loan]{Items: []domain.Loan{{ID: "loan-1", RemainingAmount: s.remaining}}}, nil
}
func (s *fakeLedgerStore) CreateLoan(context.Context, string, domain.CreateLoan) (domain.Loan, error) {
	return domain.Loan{}, nil
}
func (s *fakeLedgerStore) UpdateLoan(context.Context, string, domain.UpdateLoan) (domain.Loan, error) {
	return domain.Loan{}, nil
}
func (s *fakeLedgerStore) DeleteLoan(context.Context, string, string) error { return nil }
func (s *fakeLedgerStore) DashboardSummary(context.Context, string, string) (domain.DashboardSummary, error) {
	return domain.DashboardSummary{}, nil
}
func (s *fakeLedgerStore) StatisticsSummary(context.Context, string, int) (domain.StatisticsSummary, error) {
	return domain.StatisticsSummary{}, nil
}

func TestTransactionBatchCreatesItemsAndAppliesLoanPayment(t *testing.T) {
	store := &fakeLedgerStore{remaining: 10_000}
	service := NewService(store, fakeAuthenticator{})
	payload, _ := json.Marshal(domain.BatchTransactions{Transactions: []domain.CreateTransaction{
		{Type: domain.Expense, Date: "2026-04-29", CategoryID: "credit-payments", Title: "Payment", Amount: 2500, LoanID: "loan-1"},
	}})
	request := httptest.NewRequest(http.MethodPost, "/api/ledger/transactions/batch", bytes.NewReader(payload))
	request.Header.Set("Authorization", "Bearer token")
	response := httptest.NewRecorder()

	service.Routes().ServeHTTP(response, request)

	if response.Code != http.StatusCreated {
		t.Fatalf("expected status 201, got %d: %s", response.Code, response.Body.String())
	}
	if store.remaining != 7500 {
		t.Fatalf("expected remaining amount 7500, got %v", store.remaining)
	}
}

func TestCreateObligation(t *testing.T) {
	store := &fakeLedgerStore{remaining: 10_000}
	service := NewService(store, fakeAuthenticator{})
	payload, _ := json.Marshal(domain.CreateObligation{
		Name:       "Интернет",
		Amount:     1200,
		DueDay:     15,
		CategoryID: "utilities",
	})
	request := httptest.NewRequest(http.MethodPost, "/api/ledger/obligations", bytes.NewReader(payload))
	request.Header.Set("Authorization", "Bearer token")
	response := httptest.NewRecorder()

	service.Routes().ServeHTTP(response, request)

	if response.Code != http.StatusCreated {
		t.Fatalf("expected status 201, got %d: %s", response.Code, response.Body.String())
	}
	if len(store.obligations) != 1 {
		t.Fatalf("expected one obligation, got %d", len(store.obligations))
	}
	if store.obligations[0].CategoryID != "utilities" {
		t.Fatalf("expected utilities category, got %q", store.obligations[0].CategoryID)
	}
}
