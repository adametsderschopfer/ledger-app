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
	admin       domain.User
	regularUser domain.User
	created     domain.User
}

func (s *fakeAuthStore) Login(context.Context, domain.LoginCredentials) (domain.AuthSession, error) {
	return domain.AuthSession{User: s.admin, Token: "token-1"}, nil
}
func (s *fakeAuthStore) Logout(context.Context, string) error { return nil }
func (s *fakeAuthStore) ValidateSession(_ context.Context, token string) (domain.User, error) {
	if token == "admin-token" {
		return s.admin, nil
	}
	if token == "user-token" {
		return s.regularUser, nil
	}
	return domain.User{}, ErrInvalidCredentials
}
func (s *fakeAuthStore) UpdateProfile(_ context.Context, _ string, profile domain.UpdateProfile) (domain.User, error) {
	s.admin.Name = profile.Name
	s.admin.Email = profile.Email
	s.admin.AvatarURL = profile.AvatarURL
	return s.admin, nil
}
func (s *fakeAuthStore) UpdatePassword(context.Context, string, domain.UpdatePassword) error {
	return nil
}
func (s *fakeAuthStore) ListUsers(context.Context, domain.ListOptions) (domain.PagedResponse[domain.User], error) {
	return domain.PagedResponse[domain.User]{Items: []domain.User{s.admin}}, nil
}
func (s *fakeAuthStore) CreateUser(_ context.Context, user domain.CreateUser) (domain.User, error) {
	s.created = domain.User{ID: "created-user", Name: user.Name, Email: user.Email, Role: user.Role, IsActive: true}
	return s.created, nil
}

func TestUpdateProfileReturnsUpdatedUser(t *testing.T) {
	store := &fakeAuthStore{
		admin: domain.User{ID: "admin-user", Name: "Admin", Email: "admin@ledger.local", Role: domain.RoleAdmin, IsActive: true},
	}
	service := NewService(store)
	body, _ := json.Marshal(domain.UpdateProfile{Name: "Owner", Email: "owner@ledger.local", AvatarURL: "data:image/png;base64,a"})
	request := httptest.NewRequest(http.MethodPatch, "/api/auth/profile", bytes.NewReader(body))
	request.Header.Set("Authorization", "Bearer admin-token")
	response := httptest.NewRecorder()

	service.Routes().ServeHTTP(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", response.Code, response.Body.String())
	}
	if store.admin.Name != "Owner" || store.admin.Email != "owner@ledger.local" || store.admin.AvatarURL == "" {
		t.Fatalf("expected profile update, got %+v", store.admin)
	}
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

func TestCreateUserRejectsNonAdmin(t *testing.T) {
	store := &fakeAuthStore{
		regularUser: domain.User{ID: "regular-user", Name: "User", Email: "user@ledger.local", Role: domain.RoleUser, IsActive: true},
	}
	service := NewService(store)
	body, _ := json.Marshal(domain.CreateUser{Name: "User", Email: "new@ledger.local", Password: "1234", Role: domain.RoleUser})
	request := httptest.NewRequest(http.MethodPost, "/api/server/users", bytes.NewReader(body))
	request.Header.Set("Authorization", "Bearer user-token")
	response := httptest.NewRecorder()

	service.Routes().ServeHTTP(response, request)

	if response.Code != http.StatusForbidden {
		t.Fatalf("expected status 403, got %d: %s", response.Code, response.Body.String())
	}
	if store.created.ID != "" {
		t.Fatalf("expected store not to create user, got %+v", store.created)
	}
}
