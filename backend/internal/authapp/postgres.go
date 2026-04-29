package authapp

import (
	"context"
	"database/sql"
	"errors"
	"strings"

	"ledger/backend/internal/domain"
	"ledger/backend/internal/platform"

	"github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
)

type PostgresStore struct {
	db *sql.DB
}

func NewPostgresStore(db *sql.DB) *PostgresStore {
	return &PostgresStore{db: db}
}

func (s *PostgresStore) Migrate(ctx context.Context) error {
	_, err := s.db.ExecContext(ctx, `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'admin')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

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
`)
	if err != nil {
		return err
	}

	if err := s.ensureDefaultUser(ctx, domain.CreateUser{Name: "Администратор", Email: "admin@ledger.local", Password: "admin", Role: domain.RoleAdmin}, "admin-user"); err != nil {
		return err
	}
	return s.ensureDefaultUser(ctx, domain.CreateUser{Name: "Пользователь", Email: "user@ledger.local", Password: "user", Role: domain.RoleUser}, "regular-user")
}

func (s *PostgresStore) Login(ctx context.Context, credentials domain.LoginCredentials) (domain.AuthSession, error) {
	var user domain.User
	var passwordHash string
	err := s.db.QueryRowContext(ctx, `
SELECT id, name, email, password_hash, role, is_active
FROM users
WHERE lower(email) = lower($1)
`, strings.TrimSpace(credentials.Email)).Scan(&user.ID, &user.Name, &user.Email, &passwordHash, &user.Role, &user.IsActive)
	if err != nil {
		return domain.AuthSession{}, ErrInvalidCredentials
	}

	if !user.IsActive || bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(credentials.Password)) != nil {
		return domain.AuthSession{}, ErrInvalidCredentials
	}

	token := platform.NewToken()
	_, err = s.db.ExecContext(ctx, `INSERT INTO sessions (token, user_id) VALUES ($1, $2)`, token, user.ID)
	if err != nil {
		return domain.AuthSession{}, err
	}

	return domain.AuthSession{User: user, Token: token}, nil
}

func (s *PostgresStore) Logout(ctx context.Context, token string) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM sessions WHERE token = $1`, token)
	return err
}

func (s *PostgresStore) ValidateSession(ctx context.Context, token string) (domain.User, error) {
	var user domain.User
	err := s.db.QueryRowContext(ctx, `
SELECT u.id, u.name, u.email, u.role, u.is_active
FROM sessions s
JOIN users u ON u.id = s.user_id
WHERE s.token = $1
`, token).Scan(&user.ID, &user.Name, &user.Email, &user.Role, &user.IsActive)
	if err != nil {
		return domain.User{}, ErrInvalidCredentials
	}

	return user, nil
}

func (s *PostgresStore) ListUsers(ctx context.Context) ([]domain.User, error) {
	rows, err := s.db.QueryContext(ctx, `
SELECT id, name, email, role, is_active
FROM users
ORDER BY created_at, name
`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	users := make([]domain.User, 0)
	for rows.Next() {
		var user domain.User
		if err := rows.Scan(&user.ID, &user.Name, &user.Email, &user.Role, &user.IsActive); err != nil {
			return nil, err
		}
		users = append(users, user)
	}

	return users, rows.Err()
}

func (s *PostgresStore) CreateUser(ctx context.Context, user domain.CreateUser) (domain.User, error) {
	if strings.TrimSpace(user.Name) == "" || strings.TrimSpace(user.Email) == "" || user.Password == "" {
		return domain.User{}, errors.New("missing required user fields")
	}
	if user.Role != domain.RoleAdmin && user.Role != domain.RoleUser {
		return domain.User{}, errors.New("invalid user role")
	}

	return s.ensureUser(ctx, user, platform.NewID("user"))
}

func (s *PostgresStore) DeleteUser(ctx context.Context, userID string) error {
	result, err := s.db.ExecContext(ctx, `DELETE FROM users WHERE id = $1`, userID)
	if err != nil {
		return err
	}
	if affected, _ := result.RowsAffected(); affected == 0 {
		return ErrNotFound
	}

	return nil
}

func (s *PostgresStore) ToggleUser(ctx context.Context, userID string) (domain.User, error) {
	var user domain.User
	err := s.db.QueryRowContext(ctx, `
UPDATE users
SET is_active = NOT is_active
WHERE id = $1
RETURNING id, name, email, role, is_active
`, userID).Scan(&user.ID, &user.Name, &user.Email, &user.Role, &user.IsActive)
	if err != nil {
		return domain.User{}, ErrNotFound
	}

	if !user.IsActive {
		_, _ = s.db.ExecContext(ctx, `DELETE FROM sessions WHERE user_id = $1`, user.ID)
	}

	return user, nil
}

func (s *PostgresStore) ensureUser(ctx context.Context, user domain.CreateUser, userID string) (domain.User, error) {
	passwordHash, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
	if err != nil {
		return domain.User{}, err
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return domain.User{}, err
	}
	defer tx.Rollback()

	created := domain.User{
		ID:       userID,
		Name:     strings.TrimSpace(user.Name),
		Email:    strings.ToLower(strings.TrimSpace(user.Email)),
		Role:     user.Role,
		IsActive: true,
	}
	err = tx.QueryRowContext(ctx, `
INSERT INTO users (id, name, email, password_hash, role)
VALUES ($1, $2, $3, $4, $5)
RETURNING id, name, email, role, is_active
`, created.ID, created.Name, created.Email, string(passwordHash), created.Role).Scan(
		&created.ID, &created.Name, &created.Email, &created.Role, &created.IsActive,
	)
	if err != nil {
		var pqErr *pq.Error
		if errors.As(err, &pqErr) && pqErr.Code == "23505" {
			return domain.User{}, ErrConflict
		}
		return domain.User{}, err
	}

	if err := seedDefaultCategories(ctx, tx, created.ID); err != nil {
		return domain.User{}, err
	}

	if err := tx.Commit(); err != nil {
		return domain.User{}, err
	}

	return created, nil
}

func (s *PostgresStore) ensureDefaultUser(ctx context.Context, user domain.CreateUser, userID string) error {
	if _, err := s.ensureUser(ctx, user, userID); err == nil {
		return nil
	} else if !errors.Is(err, ErrConflict) {
		return err
	}

	var existingID string
	err := s.db.QueryRowContext(ctx, `
SELECT id
FROM users
WHERE id = $1 OR lower(email) = lower($2)
ORDER BY CASE WHEN id = $1 THEN 0 ELSE 1 END
LIMIT 1
`, userID, strings.TrimSpace(user.Email)).Scan(&existingID)
	if err != nil {
		return err
	}

	return seedDefaultCategories(ctx, s.db, existingID)
}

type categorySeeder interface {
	ExecContext(context.Context, string, ...any) (sql.Result, error)
}

func seedDefaultCategories(ctx context.Context, tx categorySeeder, userID string) error {
	for _, category := range domain.DefaultCategories(userID) {
		_, err := tx.ExecContext(ctx, `
INSERT INTO categories (user_id, id, name, type, color, is_system, links_to_loan)
VALUES ($1, $2, $3, $4, $5, $6, $7)
ON CONFLICT (user_id, id) DO NOTHING
`, userID, category.ID, category.Name, category.Type, category.Color, category.IsSystem, category.LinksToLoan)
		if err != nil {
			return err
		}
	}

	return nil
}
