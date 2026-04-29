package ledgerapp

import (
	"context"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"ledger/backend/internal/domain"
	"ledger/backend/internal/platform"
)

var (
	ErrNotFound      = errors.New("not found")
	ErrInvalidCursor = errors.New("invalid cursor")
)

type Store interface {
	ListCategories(ctx context.Context, userID string, options domain.ListOptions) (domain.PagedResponse[domain.Category], error)
	CreateCategory(ctx context.Context, userID string, category domain.CreateCategory) (domain.Category, error)
	DeleteCategory(ctx context.Context, userID, categoryID string) error
	ListTransactions(ctx context.Context, userID string, filters domain.TransactionFilters) (domain.PagedResponse[domain.LedgerTransaction], error)
	CreateTransaction(ctx context.Context, userID string, transaction domain.CreateTransaction) (domain.LedgerTransaction, error)
	CreateTransactions(ctx context.Context, userID string, transactions []domain.CreateTransaction) ([]domain.LedgerTransaction, error)
	ListObligations(ctx context.Context, userID string, options domain.ListOptions) (domain.PagedResponse[domain.Obligation], error)
	CreateObligation(ctx context.Context, userID string, obligation domain.CreateObligation) (domain.Obligation, error)
	UpdateObligation(ctx context.Context, userID string, obligation domain.UpdateObligation) (domain.Obligation, error)
	DeleteObligation(ctx context.Context, userID, obligationID string) error
	ListLoans(ctx context.Context, userID string, options domain.ListOptions) (domain.PagedResponse[domain.Loan], error)
	CreateLoan(ctx context.Context, userID string, loan domain.CreateLoan) (domain.Loan, error)
	UpdateLoan(ctx context.Context, userID string, loan domain.UpdateLoan) (domain.Loan, error)
	DeleteLoan(ctx context.Context, userID, loanID string) error
	DashboardSummary(ctx context.Context, userID string, month string) (domain.DashboardSummary, error)
	StatisticsSummary(ctx context.Context, userID string, months int) (domain.StatisticsSummary, error)
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
	mux.HandleFunc("GET /api/ledger/dashboard-summary", s.dashboardSummary)
	mux.HandleFunc("GET /api/ledger/statistics-summary", s.statisticsSummary)
	mux.HandleFunc("GET /api/ledger/transactions", s.transactions)
	mux.HandleFunc("POST /api/ledger/transactions", s.transactions)
	mux.HandleFunc("POST /api/ledger/transactions/batch", s.createTransactionBatch)
	mux.HandleFunc("GET /api/ledger/obligations", s.obligations)
	mux.HandleFunc("POST /api/ledger/obligations", s.obligations)
	mux.HandleFunc("PUT /api/ledger/obligations/", s.updateObligation)
	mux.HandleFunc("DELETE /api/ledger/obligations/", s.deleteObligation)
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
		options, ok := parseListOptions(w, r, 30)
		if !ok {
			return
		}
		categories, err := s.store.ListCategories(r.Context(), user.ID, options)
		if err != nil {
			if errors.Is(err, ErrInvalidCursor) {
				platform.WriteError(w, http.StatusBadRequest, "invalid pagination cursor")
				return
			}
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
		filters, ok := parseTransactionFilters(w, r)
		if !ok {
			return
		}
		transactions, err := s.store.ListTransactions(r.Context(), user.ID, filters)
		if err != nil {
			if errors.Is(err, ErrInvalidCursor) {
				platform.WriteError(w, http.StatusBadRequest, "invalid pagination cursor")
				return
			}
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

func (s *Service) dashboardSummary(w http.ResponseWriter, r *http.Request) {
	user, ok := s.requireUser(w, r)
	if !ok {
		return
	}

	month := r.URL.Query().Get("month")
	if month == "" {
		now := time.Now()
		month = now.Format("2006-01")
	}
	if len(month) != 7 {
		platform.WriteError(w, http.StatusBadRequest, "invalid month")
		return
	}

	summary, err := s.store.DashboardSummary(r.Context(), user.ID, month)
	if err != nil {
		platform.WriteError(w, http.StatusInternalServerError, "dashboard summary could not be loaded")
		return
	}

	platform.WriteJSON(w, http.StatusOK, summary)
}

func (s *Service) statisticsSummary(w http.ResponseWriter, r *http.Request) {
	user, ok := s.requireUser(w, r)
	if !ok {
		return
	}

	months := 12
	if raw := r.URL.Query().Get("months"); raw != "" {
		value, err := strconv.Atoi(raw)
		if err != nil || value < 1 || value > 36 {
			platform.WriteError(w, http.StatusBadRequest, "invalid months")
			return
		}
		months = value
	}

	summary, err := s.store.StatisticsSummary(r.Context(), user.ID, months)
	if err != nil {
		platform.WriteError(w, http.StatusInternalServerError, "statistics summary could not be loaded")
		return
	}

	platform.WriteJSON(w, http.StatusOK, summary)
}

func (s *Service) obligations(w http.ResponseWriter, r *http.Request) {
	user, ok := s.requireUser(w, r)
	if !ok {
		return
	}

	switch r.Method {
	case http.MethodGet:
		options, ok := parseListOptions(w, r, 30)
		if !ok {
			return
		}
		obligations, err := s.store.ListObligations(r.Context(), user.ID, options)
		if err != nil {
			if errors.Is(err, ErrInvalidCursor) {
				platform.WriteError(w, http.StatusBadRequest, "invalid pagination cursor")
				return
			}
			platform.WriteError(w, http.StatusInternalServerError, "obligations could not be loaded")
			return
		}
		platform.WriteJSON(w, http.StatusOK, obligations)
	case http.MethodPost:
		var payload domain.CreateObligation
		if err := platform.ReadJSON(r, &payload); err != nil {
			platform.WriteError(w, http.StatusBadRequest, "invalid obligation payload")
			return
		}
		created, err := s.store.CreateObligation(r.Context(), user.ID, payload)
		if err != nil {
			platform.WriteError(w, http.StatusBadRequest, "obligation could not be created")
			return
		}
		platform.WriteJSON(w, http.StatusCreated, created)
	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func (s *Service) updateObligation(w http.ResponseWriter, r *http.Request) {
	user, ok := s.requireUser(w, r)
	if !ok {
		return
	}

	obligationID := strings.TrimPrefix(r.URL.Path, "/api/ledger/obligations/")
	if obligationID == "" || strings.Contains(obligationID, "/") {
		platform.WriteError(w, http.StatusBadRequest, "invalid obligation id")
		return
	}

	var payload domain.UpdateObligation
	if err := platform.ReadJSON(r, &payload); err != nil {
		platform.WriteError(w, http.StatusBadRequest, "invalid obligation payload")
		return
	}
	payload.ID = obligationID

	updated, err := s.store.UpdateObligation(r.Context(), user.ID, payload)
	if err != nil {
		platform.WriteError(w, http.StatusNotFound, "obligation was not found")
		return
	}

	platform.WriteJSON(w, http.StatusOK, updated)
}

func (s *Service) deleteObligation(w http.ResponseWriter, r *http.Request) {
	user, ok := s.requireUser(w, r)
	if !ok {
		return
	}

	obligationID := strings.TrimPrefix(r.URL.Path, "/api/ledger/obligations/")
	if obligationID == "" || strings.Contains(obligationID, "/") {
		platform.WriteError(w, http.StatusBadRequest, "invalid obligation id")
		return
	}

	if err := s.store.DeleteObligation(r.Context(), user.ID, obligationID); err != nil {
		platform.WriteError(w, http.StatusNotFound, "obligation was not found")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (s *Service) loans(w http.ResponseWriter, r *http.Request) {
	user, ok := s.requireUser(w, r)
	if !ok {
		return
	}

	switch r.Method {
	case http.MethodGet:
		options, ok := parseListOptions(w, r, 30)
		if !ok {
			return
		}
		loans, err := s.store.ListLoans(r.Context(), user.ID, options)
		if err != nil {
			if errors.Is(err, ErrInvalidCursor) {
				platform.WriteError(w, http.StatusBadRequest, "invalid pagination cursor")
				return
			}
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

func parseListOptions(w http.ResponseWriter, r *http.Request, defaultLimit int) (domain.ListOptions, bool) {
	limit := defaultLimit
	if raw := r.URL.Query().Get("limit"); raw != "" {
		value, err := strconv.Atoi(raw)
		if err != nil || value < 1 {
			platform.WriteError(w, http.StatusBadRequest, "invalid limit")
			return domain.ListOptions{}, false
		}
		limit = value
	}
	if limit > 100 {
		limit = 100
	}

	return domain.ListOptions{Limit: limit, Cursor: strings.TrimSpace(r.URL.Query().Get("cursor"))}, true
}

func parseTransactionFilters(w http.ResponseWriter, r *http.Request) (domain.TransactionFilters, bool) {
	options, ok := parseListOptions(w, r, 30)
	if !ok {
		return domain.TransactionFilters{}, false
	}

	transactionType := domain.TransactionType(strings.TrimSpace(r.URL.Query().Get("type")))
	if transactionType != "" && transactionType != domain.Income && transactionType != domain.Expense {
		platform.WriteError(w, http.StatusBadRequest, "invalid transaction type")
		return domain.TransactionFilters{}, false
	}

	return domain.TransactionFilters{
		ListOptions: options,
		Type:        transactionType,
		CategoryID:  strings.TrimSpace(r.URL.Query().Get("categoryId")),
		StartDate:   strings.TrimSpace(r.URL.Query().Get("startDate")),
		EndDate:     strings.TrimSpace(r.URL.Query().Get("endDate")),
		Search:      strings.TrimSpace(r.URL.Query().Get("search")),
	}, true
}
