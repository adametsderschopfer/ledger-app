package platform

import (
	"net"
	"net/url"
	"os"
)

func Env(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}

	return fallback
}

func PostgresURL() string {
	if value := os.Getenv("DATABASE_URL"); value != "" {
		return value
	}

	postgresURL := url.URL{
		Scheme: "postgres",
		User: url.UserPassword(
			Env("POSTGRES_USER", "ledger"),
			Env("POSTGRES_PASSWORD", "ledger"),
		),
		Host: net.JoinHostPort(
			Env("POSTGRES_HOST", "localhost"),
			Env("POSTGRES_PORT", "5433"),
		),
		Path: "/" + Env("POSTGRES_DB", "ledger"),
	}

	query := postgresURL.Query()
	query.Set("sslmode", Env("POSTGRES_SSLMODE", "disable"))
	postgresURL.RawQuery = query.Encode()
	return postgresURL.String()
}
