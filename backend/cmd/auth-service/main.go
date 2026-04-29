package main

import (
	"context"
	"log"
	"net/http"
	"strings"

	"ledger/backend/internal/authapp"
	"ledger/backend/internal/domain"
	"ledger/backend/internal/platform"
)

func main() {
	ctx := context.Background()
	db, err := platform.OpenPostgres(ctx, platform.Env("DATABASE_URL", "postgres://ledger:ledger@localhost:5433/ledger?sslmode=disable"))
	if err != nil {
		log.Fatalf("connect postgres: %v", err)
	}
	defer db.Close()

	store := authapp.NewPostgresStore(db)
	if err := store.Migrate(ctx, defaultUsers()); err != nil {
		log.Fatalf("migrate auth schema: %v", err)
	}

	addr := ":" + platform.Env("PORT", "8081")
	log.Printf("auth-service listening on %s", addr)
	if err := http.ListenAndServe(addr, authapp.NewService(store).Routes()); err != nil {
		log.Fatal(err)
	}
}

func defaultUsers() []authapp.DefaultUser {
	users := []authapp.DefaultUser{
		{
			ID: platform.Env("DEFAULT_ADMIN_ID", "admin-user"),
			User: domain.CreateUser{
				Name:     platform.Env("DEFAULT_ADMIN_NAME", "Administrator"),
				Email:    platform.Env("DEFAULT_ADMIN_EMAIL", "admin@ledger.local"),
				Password: platform.Env("DEFAULT_ADMIN_PASSWORD", "admin"),
				Role:     domain.RoleAdmin,
			},
		},
	}

	if strings.EqualFold(platform.Env("DEFAULT_USER_ENABLED", "true"), "true") {
		users = append(users, authapp.DefaultUser{
			ID: platform.Env("DEFAULT_USER_ID", "regular-user"),
			User: domain.CreateUser{
				Name:     platform.Env("DEFAULT_USER_NAME", "User"),
				Email:    platform.Env("DEFAULT_USER_EMAIL", "user@ledger.local"),
				Password: platform.Env("DEFAULT_USER_PASSWORD", "user"),
				Role:     domain.RoleUser,
			},
		})
	}

	return users
}
