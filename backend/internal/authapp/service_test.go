package authapp

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"ledger/backend/internal/domain"
)

type fakeAuthStore struct {
	admin   domain.User
	created domain.User
}

func (s *fakeAuthStore) Login(context.Context, domain.LoginCredentials) (domain.AuthSession, error) {
	return domain.AuthSession{User: s.admin, Token: "token-1"}, nil
}
func (s *fakeAuthStore) Logout(context.Context, string) error { return nil }
func (s *fakeAuthStore) ValidateSession(_ context.Context, token string) (domain.User, error) {
	if token == "admin-token" {
		return s.admin, nil
	}
	return domain.User{}, ErrInvalidCredentials
}
func (s *fakeAuthStore) ListUsers(context.Context) ([]domain.User, error) {
	return []domain.User{s.admin}, nil
}
func (s *fakeAuthStore) CreateUser(_ context.Context, user domain.CreateUser) (domain.User, error) {
	s.created = domain.User{ID: "created-user", Name: user.Name, Email: user.Email, Role: user.Role, IsActive: true}
	return s.created, nil
}
func (s *fakeAuthStore) DeleteUser(context.Context, string) error { return nil }
func (s *fakeAuthStore) ToggleUser(context.Context, string) (domain.User, error) {
	return s.admin, nil
}

func TestCreateUserRequiresAdminAndReturnsCreatedUser(t *testing.T) {
	store := &fakeAuthStore{
		admin: domain.User{ID: "admin-user", Name: "Admin", Email: "admin@ledger.local", Role: domain.RoleAdmin, IsActive: true},
	}
	service := NewService(store)
	body, _ := json.Marshal(domain.CreateUser{Name: "User", Email: "new@ledger.local", Password: "1234", Role: domain.RoleUser})
	request := httptest.NewRequest(http.MethodPost, "/api/server/users", bytes.NewReader(body))
	request.Header.Set("Authorization", "Bearer admin-token")
	response := httptest.NewRecorder()

	service.Routes().ServeHTTP(response, request)

	if response.Code != http.StatusCreated {
		t.Fatalf("expected status 201, got %d: %s", response.Code, response.Body.String())
	}
	if store.created.ID != "created-user" {
		t.Fatalf("expected store to create user, got %+v", store.created)
	}
}
