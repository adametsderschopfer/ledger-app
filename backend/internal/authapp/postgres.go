package authapp

import (
	"context"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"ledger/backend/internal/domain"
	"ledger/backend/internal/platform"

	"github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
)

type PostgresStore struct {
	db       *sql.DB
	language domain.AppLanguage
}

type DefaultUser struct {
	ID   string
	User domain.CreateUser
}

func NewPostgresStore(db *sql.DB, languages ...domain.AppLanguage) *PostgresStore {
	language := domain.LanguageRU
	if len(languages) > 0 {
		language = domain.NormalizeLanguage(string(languages[0]))
	}
	return &PostgresStore{db: db, language: language}
}

func (s *PostgresStore) Migrate(ctx context.Context, defaultUsers []DefaultUser) error {
	_, err := s.db.ExecContext(ctx, `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  avatar_url TEXT NOT NULL DEFAULT '',
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

CREATE INDEX IF NOT EXISTS idx_auth_users_page
ON users (created_at, name, id);
`)
	if err != nil {
		return err
	}

	if _, err := s.db.ExecContext(ctx, `ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT NOT NULL DEFAULT ''`); err != nil {
		return err
	}

	for _, defaultUser := range defaultUsers {
		if err := s.ensureDefaultUser(ctx, defaultUser.User, defaultUser.ID); err != nil {
			return err
		}
	}

	return nil
}

func (s *PostgresStore) Login(ctx context.Context, credentials domain.LoginCredentials) (domain.AuthSession, error) {
	var user domain.User
	var passwordHash string
	err := s.db.QueryRowContext(ctx, `
SELECT id, name, email, avatar_url, password_hash, role, is_active
FROM users
WHERE lower(email) = lower($1)
`, strings.TrimSpace(credentials.Email)).Scan(&user.ID, &user.Name, &user.Email, &user.AvatarURL, &passwordHash, &user.Role, &user.IsActive)
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
SELECT u.id, u.name, u.email, u.avatar_url, u.role, u.is_active
FROM sessions s
JOIN users u ON u.id = s.user_id
WHERE s.token = $1
`, token).Scan(&user.ID, &user.Name, &user.Email, &user.AvatarURL, &user.Role, &user.IsActive)
	if err != nil {
		return domain.User{}, ErrInvalidCredentials
	}

	return user, nil
}

func (s *PostgresStore) ListUsers(ctx context.Context, options domain.ListOptions) (domain.PagedResponse[domain.User], error) {
	cursor, err := decodeCursor[userCursor](options.Cursor)
	if err != nil {
		return domain.PagedResponse[domain.User]{}, ErrInvalidCursor
	}

	args := []any{}
	query := `
SELECT id, name, email, avatar_url, role, is_active, created_at
FROM users
`
	if cursor != nil {
		args = append(args, cursor.CreatedAt, cursor.Name, cursor.ID)
		query += fmt.Sprintf("WHERE (created_at, name, id) > ($%d, $%d, $%d)\n", len(args)-2, len(args)-1, len(args))
	}
	args = append(args, normalizedLimit(options.Limit)+1)
	query += fmt.Sprintf("ORDER BY created_at, name, id LIMIT $%d", len(args))

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return domain.PagedResponse[domain.User]{}, err
	}
	defer rows.Close()

	users := make([]domain.User, 0)
	createdAtByID := make(map[string]time.Time)
	for rows.Next() {
		var user domain.User
		var createdAt time.Time
		if err := rows.Scan(&user.ID, &user.Name, &user.Email, &user.AvatarURL, &user.Role, &user.IsActive, &createdAt); err != nil {
			return domain.PagedResponse[domain.User]{}, err
		}
		createdAtByID[user.ID] = createdAt
		users = append(users, user)
	}

	if err := rows.Err(); err != nil {
		return domain.PagedResponse[domain.User]{}, err
	}

	return pageFromItems(users, options.Limit, func(user domain.User) string {
		return encodeCursor(userCursor{CreatedAt: createdAtByID[user.ID], Name: user.Name, ID: user.ID})
	}), nil
}

func (s *PostgresStore) UpdateProfile(ctx context.Context, userID string, profile domain.UpdateProfile) (domain.User, error) {
	name := strings.TrimSpace(profile.Name)
	email := strings.ToLower(strings.TrimSpace(profile.Email))
	if name == "" || email == "" {
		return domain.User{}, errors.New("missing required profile fields")
	}

	var user domain.User
	err := s.db.QueryRowContext(ctx, `
UPDATE users
SET name = $2, email = $3, avatar_url = $4
WHERE id = $1
RETURNING id, name, email, avatar_url, role, is_active
`, userID, name, email, strings.TrimSpace(profile.AvatarURL)).Scan(
		&user.ID, &user.Name, &user.Email, &user.AvatarURL, &user.Role, &user.IsActive,
	)
	if err != nil {
		var pqErr *pq.Error
		if errors.As(err, &pqErr) && pqErr.Code == "23505" {
			return domain.User{}, ErrConflict
		}
		return domain.User{}, err
	}

	return user, nil
}

func (s *PostgresStore) UpdatePassword(ctx context.Context, userID string, password domain.UpdatePassword) error {
	if len(password.NewPassword) < 4 {
		return errors.New("new password is too short")
	}

	var passwordHash string
	if err := s.db.QueryRowContext(ctx, `SELECT password_hash FROM users WHERE id = $1`, userID).Scan(&passwordHash); err != nil {
		return ErrNotFound
	}
	if bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(password.CurrentPassword)) != nil {
		return ErrInvalidCredentials
	}

	newPasswordHash, err := bcrypt.GenerateFromPassword([]byte(password.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	_, err = s.db.ExecContext(ctx, `UPDATE users SET password_hash = $2 WHERE id = $1`, userID, string(newPasswordHash))
	return err
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
RETURNING id, name, email, avatar_url, role, is_active
`, userID).Scan(&user.ID, &user.Name, &user.Email, &user.AvatarURL, &user.Role, &user.IsActive)
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
RETURNING id, name, email, avatar_url, role, is_active
`, created.ID, created.Name, created.Email, string(passwordHash), created.Role).Scan(
		&created.ID, &created.Name, &created.Email, &created.AvatarURL, &created.Role, &created.IsActive,
	)
	if err != nil {
		var pqErr *pq.Error
		if errors.As(err, &pqErr) && pqErr.Code == "23505" {
			return domain.User{}, ErrConflict
		}
		return domain.User{}, err
	}

	if err := seedDefaultCategories(ctx, tx, created.ID, s.language); err != nil {
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

	return seedDefaultCategories(ctx, s.db, existingID, s.language)
}

type categorySeeder interface {
	ExecContext(context.Context, string, ...any) (sql.Result, error)
}

func seedDefaultCategories(ctx context.Context, tx categorySeeder, userID string, language domain.AppLanguage) error {
	for _, category := range domain.DefaultCategories(userID, language) {
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

type userCursor struct {
	CreatedAt time.Time `json:"createdAt"`
	Name      string    `json:"name"`
	ID        string    `json:"id"`
}

func normalizedLimit(limit int) int {
	if limit < 1 {
		return 30
	}
	if limit > 100 {
		return 100
	}
	return limit
}

func pageFromItems[T any](items []T, limit int, cursorFor func(T) string) domain.PagedResponse[T] {
	limit = normalizedLimit(limit)
	hasMore := len(items) > limit
	if hasMore {
		items = items[:limit]
	}
	nextCursor := ""
	if hasMore && len(items) > 0 {
		nextCursor = cursorFor(items[len(items)-1])
	}
	return domain.PagedResponse[T]{Items: items, NextCursor: nextCursor, HasMore: hasMore}
}

func encodeCursor(value any) string {
	raw, _ := json.Marshal(value)
	return base64.RawURLEncoding.EncodeToString(raw)
}

func decodeCursor[T any](cursor string) (*T, error) {
	if strings.TrimSpace(cursor) == "" {
		return nil, nil
	}
	raw, err := base64.RawURLEncoding.DecodeString(cursor)
	if err != nil {
		return nil, err
	}
	var value T
	if err := json.Unmarshal(raw, &value); err != nil {
		return nil, err
	}
	return &value, nil
}
