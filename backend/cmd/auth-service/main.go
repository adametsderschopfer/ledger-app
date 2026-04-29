package main

import (
	"context"
	"log"
	"net/http"

	"ledger/backend/internal/authapp"
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
	if err := store.Migrate(ctx); err != nil {
		log.Fatalf("migrate auth schema: %v", err)
	}

	addr := ":" + platform.Env("PORT", "8081")
	log.Printf("auth-service listening on %s", addr)
	if err := http.ListenAndServe(addr, authapp.NewService(store).Routes()); err != nil {
		log.Fatal(err)
	}
}
