package main

import (
	"context"
	"log"
	"net/http"

	"ledger/backend/internal/authapp"
	"ledger/backend/internal/domain"
	"ledger/backend/internal/platform"
)

func main() {
	ctx := context.Background()
	db, err := platform.OpenPostgres(ctx, platform.PostgresURL())
	if err != nil {
		log.Fatalf("connect postgres: %v", err)
	}
	defer db.Close()

	store := authapp.NewPostgresStore(db, appLanguage())
	if err := store.Migrate(ctx, defaultUsers()); err != nil {
		log.Fatalf("migrate auth schema: %v", err)
	}

	addr := ":" + platform.Env("PORT", "8081")
	log.Printf("auth-service listening on %s", addr)
	if err := http.ListenAndServe(addr, authapp.NewService(store).Routes()); err != nil {
		log.Fatal(err)
	}
}

func appLanguage() domain.AppLanguage {
	return domain.NormalizeLanguage(platform.Env("APP_LANGUAGE", "RU"))
}

func defaultUsers() []authapp.DefaultUser {
	return []authapp.DefaultUser{
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
}
