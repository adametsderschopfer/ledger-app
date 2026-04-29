# Ledger Go Backend

Backend is split into small services behind an API gateway:

- `api-gateway` exposes `/api/*` on `localhost:8080` and proxies requests.
- `auth-service` owns users, sessions, admin user management, and default category seeding.
- `ledger-service` owns categories, transactions, loans, and loan-payment balance updates.
- `postgres` stores all service data.

Default accounts are created on startup:

- `admin@ledger.local` / `admin`
- `user@ledger.local` / `user`

Every newly created user receives the fixed base category list from `domain.DefaultCategories`. Those categories are intentionally not system-locked, so the user can clear them from Settings.

## Local Run

```bash
docker compose up --build -d
```

Gateway health:

```bash
curl http://localhost:8080/health
```

Backend tests:

```bash
cd ledger-go
go test ./...
```

