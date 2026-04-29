package platform

import (
	"net/url"
	"testing"
)

func TestPostgresURLUsesExplicitDatabaseURL(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgres://custom:secret@db:5432/custom?sslmode=require")

	got := PostgresURL()
	want := "postgres://custom:secret@db:5432/custom?sslmode=require"
	if got != want {
		t.Fatalf("PostgresURL() = %q, want %q", got, want)
	}
}

func TestPostgresURLBuildsFromPostgresEnvironment(t *testing.T) {
	t.Setenv("DATABASE_URL", "")
	t.Setenv("POSTGRES_HOST", "postgres")
	t.Setenv("POSTGRES_PORT", "5432")
	t.Setenv("POSTGRES_DB", "ledger")
	t.Setenv("POSTGRES_USER", "s0ck3t")
	t.Setenv("POSTGRES_PASSWORD", "p@ss word")
	t.Setenv("POSTGRES_SSLMODE", "disable")

	postgresURL, err := url.Parse(PostgresURL())
	if err != nil {
		t.Fatalf("parse postgres url: %v", err)
	}

	if postgresURL.Scheme != "postgres" {
		t.Fatalf("scheme = %q, want postgres", postgresURL.Scheme)
	}
	if postgresURL.Host != "postgres:5432" {
		t.Fatalf("host = %q, want postgres:5432", postgresURL.Host)
	}
	if postgresURL.Path != "/ledger" {
		t.Fatalf("path = %q, want /ledger", postgresURL.Path)
	}
	if postgresURL.Query().Get("sslmode") != "disable" {
		t.Fatalf("sslmode = %q, want disable", postgresURL.Query().Get("sslmode"))
	}
	if postgresURL.User.Username() != "s0ck3t" {
		t.Fatalf("username = %q, want s0ck3t", postgresURL.User.Username())
	}
	password, ok := postgresURL.User.Password()
	if !ok {
		t.Fatal("password was not set")
	}
	if password != "p@ss word" {
		t.Fatalf("password = %q, want p@ss word", password)
	}
}
