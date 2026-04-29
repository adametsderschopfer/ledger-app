package main

import (
	"context"
	"log"
	"net/http"

	"ledger-go/internal/ledgerapp"
	"ledger-go/internal/platform"

	_ "github.com/lib/pq"
)

func main() {
	ctx := context.Background()
	db, err := platform.OpenPostgres(ctx, platform.Env("DATABASE_URL", "postgres://ledger:ledger@localhost:5433/ledger?sslmode=disable"))
	if err != nil {
		log.Fatalf("connect postgres: %v", err)
	}
	defer db.Close()

	store := ledgerapp.NewPostgresStore(db)
	if err := store.Migrate(ctx); err != nil {
		log.Fatalf("migrate ledger schema: %v", err)
	}

	authClient := ledgerapp.NewAuthClient(platform.Env("AUTH_SERVICE_URL", "http://localhost:8081"))
	addr := ":" + platform.Env("PORT", "8082")
	log.Printf("ledger-service listening on %s", addr)
	if err := http.ListenAndServe(addr, ledgerapp.NewService(store, authClient).Routes()); err != nil {
		log.Fatal(err)
	}
}
