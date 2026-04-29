package main

import (
	"context"
	"log"
	"net/http"
	"time"

	"ledger/backend/internal/ledgerapp"
	"ledger/backend/internal/platform"

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
	for {
		if err := store.Migrate(ctx); err == nil {
			break
		} else {
			log.Printf("waiting for auth schema before ledger migration: %v", err)
			time.Sleep(time.Second)
		}
	}

	authClient := ledgerapp.NewAuthClient(platform.Env("AUTH_SERVICE_URL", "http://localhost:8081"))
	addr := ":" + platform.Env("PORT", "8082")
	log.Printf("ledger-service listening on %s", addr)
	if err := http.ListenAndServe(addr, ledgerapp.NewService(store, authClient).Routes()); err != nil {
		log.Fatal(err)
	}
}
