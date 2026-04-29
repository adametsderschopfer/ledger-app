package ledgerapp

import (
	"context"
	"errors"
	"net/http"
	"strings"

	"ledger/backend/internal/domain"
	"ledger/backend/internal/platform"
)

var ErrNotFound = errors.New("not found")

type Store interface {
	ListCategories(ctx context.Context, userID string) ([]domain.Category, error)
	CreateCategory(ctx context.Context, userID string, category domain.CreateCategory) (domain.Category, error)
	DeleteCategory(ctx context.Context, userID, categoryID string) error
	ListTransactions(ctx context.Context, userID string) ([]domain.LedgerTransaction, error)
	CreateTransaction(ctx context.Context, userID string, transaction domain.CreateTransaction) (domain.LedgerTransaction, error)
	CreateTransactions(ctx context.Context, userID string, transactions []domain.CreateTransaction) ([]domain.LedgerTransaction, error)
	ListLoans(ctx context.Context, userID string) ([]domain.Loan, error)
	CreateLoan(ctx context.Context, userID string, loan domain.CreateLoan) (domain.Loan, error)
	UpdateLoan(ctx context.Context, userID string, loan domain.UpdateLoan) (domain.Loan, error)
	DeleteLoan(ctx context.Context, userID, loanID string) error
}

type Service struct {
	store Store
	auth  Authenticator
}

func NewService(store Store, auth Authenticator) *Service {
	return &Service{store: store, auth: auth}
}

func (s *Service) Routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, _ *http.Request) {
		platform.WriteJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})
	mux.HandleFunc("GET /api/ledger/categories", s.categories)
	mux.HandleFunc("POST /api/ledger/categories", s.categories)
	mux.HandleFunc("DELETE /api/ledger/categories/", s.deleteCategory)
	mux.HandleFunc("GET /api/ledger/transactions", s.transactions)
	mux.HandleFunc("POST /api/ledger/transactions", s.transactions)
	mux.HandleFunc("POST /api/ledger/transactions/batch", s.createTransactionBatch)
	mux.HandleFunc("GET /api/ledger/loans", s.loans)
	mux.HandleFunc("POST /api/ledger/loans", s.loans)
	mux.HandleFunc("PUT /api/ledger/loans/", s.updateLoan)
	mux.HandleFunc("DELETE /api/ledger/loans/", s.deleteLoan)
	return mux
}

func (s *Service) categories(w http.ResponseWriter, r *http.Request) {
	user, ok := s.requireUser(w, r)
	if !ok {
		return
	}

	switch r.Method {
	case http.MethodGet:
		categories, err := s.store.ListCategories(r.Context(), user.ID)
		if err != nil {
			platform.WriteError(w, http.StatusInternalServerError, "categories could not be loaded")
			return
		}
		platform.WriteJSON(w, http.StatusOK, categories)
	case http.MethodPost:
		var payload domain.CreateCategory
		if err := platform.ReadJSON(r, &payload); err != nil {
			platform.WriteError(w, http.StatusBadRequest, "invalid category payload")
			return
		}
		created, err := s.store.CreateCategory(r.Context(), user.ID, payload)
		if err != nil {
			platform.WriteError(w, http.StatusBadRequest, "category could not be created")
			return
		}
		platform.WriteJSON(w, http.StatusCreated, created)
	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func (s *Service) deleteCategory(w http.ResponseWriter, r *http.Request) {
	user, ok := s.requireUser(w, r)
	if !ok {
		return
	}

	categoryID := strings.TrimPrefix(r.URL.Path, "/api/ledger/categories/")
	if categoryID == "" || strings.Contains(categoryID, "/") {
		platform.WriteError(w, http.StatusBadRequest, "invalid category id")
		return
	}

	if err := s.store.DeleteCategory(r.Context(), user.ID, categoryID); err != nil {
		status := http.StatusNotFound
		if !errors.Is(err, ErrNotFound) {
			status = http.StatusConflict
		}
		platform.WriteError(w, status, "category could not be deleted")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (s *Service) transactions(w http.ResponseWriter, r *http.Request) {
	user, ok := s.requireUser(w, r)
	if !ok {
		return
	}

	switch r.Method {
	case http.MethodGet:
		transactions, err := s.store.ListTransactions(r.Context(), user.ID)
		if err != nil {
			platform.WriteError(w, http.StatusInternalServerError, "transactions could not be loaded")
			return
		}
		platform.WriteJSON(w, http.StatusOK, transactions)
	case http.MethodPost:
		var payload domain.CreateTransaction
		if err := platform.ReadJSON(r, &payload); err != nil {
			platform.WriteError(w, http.StatusBadRequest, "invalid transaction payload")
			return
		}
		created, err := s.store.CreateTransaction(r.Context(), user.ID, payload)
		if err != nil {
			platform.WriteError(w, http.StatusBadRequest, "transaction could not be created")
			return
		}
		platform.WriteJSON(w, http.StatusCreated, created)
	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func (s *Service) createTransactionBatch(w http.ResponseWriter, r *http.Request) {
	user, ok := s.requireUser(w, r)
	if !ok {
		return
	}

	var payload domain.BatchTransactions
	if err := platform.ReadJSON(r, &payload); err != nil {
		platform.WriteError(w, http.StatusBadRequest, "invalid transactions payload")
		return
	}

	created, err := s.store.CreateTransactions(r.Context(), user.ID, payload.Transactions)
	if err != nil {
		platform.WriteError(w, http.StatusBadRequest, "transactions could not be created")
		return
	}

	platform.WriteJSON(w, http.StatusCreated, created)
}

func (s *Service) loans(w http.ResponseWriter, r *http.Request) {
	user, ok := s.requireUser(w, r)
	if !ok {
		return
	}

	switch r.Method {
	case http.MethodGet:
		loans, err := s.store.ListLoans(r.Context(), user.ID)
		if err != nil {
			platform.WriteError(w, http.StatusInternalServerError, "loans could not be loaded")
			return
		}
		platform.WriteJSON(w, http.StatusOK, loans)
	case http.MethodPost:
		var payload domain.CreateLoan
		if err := platform.ReadJSON(r, &payload); err != nil {
			platform.WriteError(w, http.StatusBadRequest, "invalid loan payload")
			return
		}
		created, err := s.store.CreateLoan(r.Context(), user.ID, payload)
		if err != nil {
			platform.WriteError(w, http.StatusBadRequest, "loan could not be created")
			return
		}
		platform.WriteJSON(w, http.StatusCreated, created)
	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func (s *Service) updateLoan(w http.ResponseWriter, r *http.Request) {
	user, ok := s.requireUser(w, r)
	if !ok {
		return
	}

	loanID := strings.TrimPrefix(r.URL.Path, "/api/ledger/loans/")
	if loanID == "" || strings.Contains(loanID, "/") {
		platform.WriteError(w, http.StatusBadRequest, "invalid loan id")
		return
	}

	var payload domain.UpdateLoan
	if err := platform.ReadJSON(r, &payload); err != nil {
		platform.WriteError(w, http.StatusBadRequest, "invalid loan payload")
		return
	}
	payload.ID = loanID

	updated, err := s.store.UpdateLoan(r.Context(), user.ID, payload)
	if err != nil {
		platform.WriteError(w, http.StatusNotFound, "loan was not found")
		return
	}

	platform.WriteJSON(w, http.StatusOK, updated)
}

func (s *Service) deleteLoan(w http.ResponseWriter, r *http.Request) {
	user, ok := s.requireUser(w, r)
	if !ok {
		return
	}

	loanID := strings.TrimPrefix(r.URL.Path, "/api/ledger/loans/")
	if loanID == "" || strings.Contains(loanID, "/") {
		platform.WriteError(w, http.StatusBadRequest, "invalid loan id")
		return
	}

	if err := s.store.DeleteLoan(r.Context(), user.ID, loanID); err != nil {
		platform.WriteError(w, http.StatusNotFound, "loan was not found")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (s *Service) requireUser(w http.ResponseWriter, r *http.Request) (domain.User, bool) {
	user, err := s.auth.Authenticate(r.Context(), r.Header.Get("Authorization"))
	if err != nil {
		platform.WriteError(w, http.StatusUnauthorized, "authentication is required")
		return domain.User{}, false
	}

	return user, true
}
