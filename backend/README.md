# Ledger Backend

Go backend services for Ledger, a self-hosted personal finance service. The backend stores application data in PostgreSQL and exposes the API consumed by the Angular frontend.

## Architecture

The backend is split into small services behind an API gateway:

- `api-gateway` exposes `/api/*` on `localhost:8080` and proxies requests.
- `auth-service` owns users, sessions, admin user management, and default category seeding.
- `ledger-service` owns categories, transactions, loans, and loan-payment balance updates.
- `postgres` stores all service data.

## Requirements

- Go 1.22 or newer.
- Docker and Docker Compose for the local self-hosted stack.
- PostgreSQL 16 when running services outside Docker.

## Local Self-Hosted Run

From the repository root:

```bash
cp .env.example .env
```

Edit `.env`, then start the stack:

```bash
docker compose up --build -d
```

Open the frontend at `http://localhost:3000`.

Gateway health:

```bash
curl http://localhost:8080/health
```

In the default development compose file, PostgreSQL is exposed on `localhost:5433` and persists data in the `ledger-postgres` Docker volume. In `docker-compose.prod.yml`, PostgreSQL is private to the Docker network.

## Default Accounts

Default accounts are created on startup from environment variables:

- `DEFAULT_ADMIN_EMAIL` / `DEFAULT_ADMIN_PASSWORD`
- `DEFAULT_USER_EMAIL` / `DEFAULT_USER_PASSWORD` when `DEFAULT_USER_ENABLED=true`

Every newly created user receives the fixed base category list from `domain.DefaultCategories`. Those categories are intentionally not system-locked, so the user can clear them from Settings.

If a default account already exists, startup keeps the existing account credentials and only ensures its default categories exist. Change example passwords in `.env` before first startup.

## Environment Variables

`api-gateway`:

- `PORT` - HTTP port, default `8080`.
- `AUTH_SERVICE_URL` - auth service URL, default `http://localhost:8081`.
- `LEDGER_SERVICE_URL` - ledger service URL, default `http://localhost:8082`.

`auth-service`:

- `PORT` - HTTP port, default `8081`.
- `DATABASE_URL` - PostgreSQL connection string, default `postgres://ledger:ledger@localhost:5433/ledger?sslmode=disable`.
- `DEFAULT_ADMIN_NAME` - initial admin display name.
- `DEFAULT_ADMIN_EMAIL` - initial admin email.
- `DEFAULT_ADMIN_PASSWORD` - initial admin password.
- `DEFAULT_USER_ENABLED` - whether to seed the regular user, default `true`.
- `DEFAULT_USER_NAME` - initial regular user display name.
- `DEFAULT_USER_EMAIL` - initial regular user email.
- `DEFAULT_USER_PASSWORD` - initial regular user password.

`ledger-service`:

- `PORT` - HTTP port, default `8082`.
- `DATABASE_URL` - PostgreSQL connection string, default `postgres://ledger:ledger@localhost:5433/ledger?sslmode=disable`.
- `AUTH_SERVICE_URL` - auth service URL, default `http://localhost:8081`.

## Development

Run tests:

```bash
go test ./...
```

Run a service locally after starting PostgreSQL:

```bash
go run ./cmd/auth-service
go run ./cmd/ledger-service
go run ./cmd/api-gateway
```

Build a service image manually from the repository root:

```bash
docker build --build-arg SERVICE=api-gateway -t ledger-api-gateway ./backend
```

Supported `SERVICE` build arguments are `api-gateway`, `auth-service`, and `ledger-service`.

## API Surface

The gateway exposes:

- `GET /health`
- `/api/auth/*`
- `/api/ledger/*`
- `/api/server/*`

## Production Notes

- Use strong credentials and rotate the default accounts.
- Restrict direct PostgreSQL access to trusted networks.
- Put the gateway behind HTTPS.
- Back up the PostgreSQL volume regularly.
- Review CORS and allowed origins for your deployment.

## License

Ledger Backend is released under the repository MIT License. See `../LICENSE`.
