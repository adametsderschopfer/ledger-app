package authapp

import (
	"context"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"ledger/backend/internal/domain"
	"ledger/backend/internal/platform"
)

var (
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrForbidden          = errors.New("forbidden")
	ErrNotFound           = errors.New("not found")
	ErrConflict           = errors.New("conflict")
	ErrInvalidCursor      = errors.New("invalid cursor")
)

type Store interface {
	Login(ctx context.Context, credentials domain.LoginCredentials) (domain.AuthSession, error)
	Logout(ctx context.Context, token string) error
	ValidateSession(ctx context.Context, token string) (domain.User, error)
	UpdateProfile(ctx context.Context, userID string, profile domain.UpdateProfile) (domain.User, error)
	UpdatePassword(ctx context.Context, userID string, password domain.UpdatePassword) error
	ListUsers(ctx context.Context, options domain.ListOptions) (domain.PagedResponse[domain.User], error)
	CreateUser(ctx context.Context, user domain.CreateUser) (domain.User, error)
	DeleteUser(ctx context.Context, userID string) error
	ToggleUser(ctx context.Context, userID string) (domain.User, error)
}

type Service struct {
	store Store
}

func NewService(store Store) *Service {
	return &Service{store: store}
}

func (s *Service) Routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, _ *http.Request) {
		platform.WriteJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})
	mux.HandleFunc("POST /api/auth/login", s.login)
	mux.HandleFunc("GET /api/auth/me", s.me)
	mux.HandleFunc("POST /api/auth/logout", s.logout)
	mux.HandleFunc("PATCH /api/auth/profile", s.updateProfile)
	mux.HandleFunc("PATCH /api/auth/password", s.updatePassword)
	mux.HandleFunc("GET /api/server/users", s.users)
	mux.HandleFunc("POST /api/server/users", s.createUser)
	mux.HandleFunc("DELETE /api/server/users/", s.deleteUser)
	mux.HandleFunc("PATCH /api/server/users/", s.toggleUser)
	mux.HandleFunc("GET /internal/auth/session", s.me)
	return mux
}

func (s *Service) login(w http.ResponseWriter, r *http.Request) {
	var credentials domain.LoginCredentials
	if err := platform.ReadJSON(r, &credentials); err != nil {
		platform.WriteError(w, http.StatusBadRequest, "invalid login payload")
		return
	}

	session, err := s.store.Login(r.Context(), credentials)
	if err != nil {
		platform.WriteError(w, http.StatusUnauthorized, "invalid email or password")
		return
	}

	platform.WriteJSON(w, http.StatusOK, session)
}

func (s *Service) me(w http.ResponseWriter, r *http.Request) {
	user, ok := s.requireUser(w, r)
	if !ok {
		return
	}

	platform.WriteJSON(w, http.StatusOK, user)
}

func (s *Service) logout(w http.ResponseWriter, r *http.Request) {
	token, err := platform.BearerToken(r)
	if err != nil {
		w.WriteHeader(http.StatusNoContent)
		return
	}

	_ = s.store.Logout(r.Context(), token)
	w.WriteHeader(http.StatusNoContent)
}

func (s *Service) updateProfile(w http.ResponseWriter, r *http.Request) {
	user, ok := s.requireUser(w, r)
	if !ok {
		return
	}

	var payload domain.UpdateProfile
	if err := platform.ReadJSON(r, &payload); err != nil {
		platform.WriteError(w, http.StatusBadRequest, "invalid profile payload")
		return
	}

	updated, err := s.store.UpdateProfile(r.Context(), user.ID, payload)
	if errors.Is(err, ErrConflict) {
		platform.WriteError(w, http.StatusConflict, "email is already used")
		return
	}
	if err != nil {
		platform.WriteError(w, http.StatusBadRequest, "profile could not be updated")
		return
	}

	platform.WriteJSON(w, http.StatusOK, updated)
}

func (s *Service) updatePassword(w http.ResponseWriter, r *http.Request) {
	user, ok := s.requireUser(w, r)
	if !ok {
		return
	}

	var payload domain.UpdatePassword
	if err := platform.ReadJSON(r, &payload); err != nil {
		platform.WriteError(w, http.StatusBadRequest, "invalid password payload")
		return
	}

	if err := s.store.UpdatePassword(r.Context(), user.ID, payload); err != nil {
		platform.WriteError(w, http.StatusBadRequest, "password could not be updated")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (s *Service) users(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireAdmin(w, r); !ok {
		return
	}

	options, ok := parseListOptions(w, r, 30)
	if !ok {
		return
	}

	users, err := s.store.ListUsers(r.Context(), options)
	if err != nil {
		if errors.Is(err, ErrInvalidCursor) {
			platform.WriteError(w, http.StatusBadRequest, "invalid pagination cursor")
			return
		}
		platform.WriteError(w, http.StatusInternalServerError, "users could not be loaded")
		return
	}

	platform.WriteJSON(w, http.StatusOK, users)
}

func (s *Service) createUser(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireAdmin(w, r); !ok {
		return
	}

	var payload domain.CreateUser
	if err := platform.ReadJSON(r, &payload); err != nil {
		platform.WriteError(w, http.StatusBadRequest, "invalid user payload")
		return
	}

	created, err := s.store.CreateUser(r.Context(), payload)
	if errors.Is(err, ErrConflict) {
		platform.WriteError(w, http.StatusConflict, "email is already used")
		return
	}
	if err != nil {
		platform.WriteError(w, http.StatusBadRequest, "user could not be created")
		return
	}

	platform.WriteJSON(w, http.StatusCreated, created)
}

func (s *Service) deleteUser(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireAdmin(w, r); !ok {
		return
	}

	userID := strings.TrimPrefix(r.URL.Path, "/api/server/users/")
	if userID == "" || strings.Contains(userID, "/") {
		platform.WriteError(w, http.StatusBadRequest, "invalid user id")
		return
	}

	if err := s.store.DeleteUser(r.Context(), userID); err != nil {
		platform.WriteError(w, http.StatusNotFound, "user was not found")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (s *Service) toggleUser(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireAdmin(w, r); !ok {
		return
	}

	userID, ok := strings.CutSuffix(strings.TrimPrefix(r.URL.Path, "/api/server/users/"), "/status")
	if !ok || userID == "" {
		platform.WriteError(w, http.StatusBadRequest, "invalid user id")
		return
	}

	updated, err := s.store.ToggleUser(r.Context(), userID)
	if err != nil {
		platform.WriteError(w, http.StatusNotFound, "user was not found")
		return
	}

	platform.WriteJSON(w, http.StatusOK, updated)
}

func (s *Service) requireAdmin(w http.ResponseWriter, r *http.Request) (domain.User, bool) {
	user, ok := s.requireUser(w, r)
	if !ok {
		return domain.User{}, false
	}

	if user.Role != domain.RoleAdmin {
		platform.WriteError(w, http.StatusForbidden, "admin role is required")
		return domain.User{}, false
	}

	return user, true
}

func (s *Service) requireUser(w http.ResponseWriter, r *http.Request) (domain.User, bool) {
	token, err := platform.BearerToken(r)
	if err != nil {
		platform.WriteError(w, http.StatusUnauthorized, "authentication is required")
		return domain.User{}, false
	}

	user, err := s.store.ValidateSession(r.Context(), token)
	if err != nil || !user.IsActive {
		platform.WriteError(w, http.StatusUnauthorized, "session is invalid")
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
