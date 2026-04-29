# Ledger

Ledger is a self-hosted personal finance service with an Angular frontend, Go backend services, and PostgreSQL storage. It is intended for private deployments where the owner controls the application, data, users, and network exposure.

## Repository Layout

- `frontend` - Angular and Angular Material web application.
- `backend` - Go services for authentication, ledger data, and API gateway routing.
- `docker-compose.yml` - Full local self-hosted stack.
- `docker-compose.prod.yml` - Production-oriented stack without a public PostgreSQL port.
- `.env.example` - Template for local secrets and ports.
- `LICENSE` - MIT License for the repository.

## Services

The Docker Compose stack runs:

- `frontend` - nginx container that serves the Angular app on `http://localhost:3000` and proxies `/api/*` to the gateway.
- `api-gateway` - public backend entrypoint on `http://localhost:8080`.
- `auth-service` - users, sessions, admin user management, and default category seeding.
- `ledger-service` - categories, transactions, loans, and loan-payment balance updates.
- `postgres` - PostgreSQL 16 database, exposed locally on `localhost:5433`.

## Self-Hosted Quick Start

Prerequisites:

- Docker and Docker Compose.

Create your local environment file:

```bash
cp .env.example .env
```

Edit `.env` and replace the default passwords before starting the stack.

Start the full service:

```bash
docker compose up --build -d
```

Open the application:

```text
http://localhost:3000
```

Check the API gateway:

```bash
curl http://localhost:8080/health
```

Default accounts are created from `.env`:

- `DEFAULT_ADMIN_EMAIL` / `DEFAULT_ADMIN_PASSWORD`
- `DEFAULT_USER_EMAIL` / `DEFAULT_USER_PASSWORD` when `DEFAULT_USER_ENABLED=true`

If default users already exist in the database, startup keeps the existing accounts and only ensures their default categories exist.

## Development

Frontend:

```bash
cd frontend
npm install
npm start
npm test
npm run build
```

The frontend development server runs on `http://localhost:4200` and proxies `/api` requests to `http://localhost:8080`.

Backend:

```bash
cd backend
go test ./...
```

Run only the backend stack from the repository root:

```bash
docker compose up --build postgres auth-service ledger-service api-gateway
```

## Production Compose

For a production-oriented baseline, use:

```bash
docker compose -f docker-compose.prod.yml up --build -d
```

The production compose file:

- exposes only the `frontend` service;
- keeps PostgreSQL private to the Docker network;
- keeps `api-gateway`, `auth-service`, and `ledger-service` internal;
- uses `restart: unless-stopped`;
- uses the same `.env` file for credentials and initial users.

## Production Notes

Before production use:

- Replace all example credentials in `.env`.
- Put the frontend behind HTTPS.
- Restrict direct PostgreSQL access to trusted networks.
- Configure backups for the `ledger-postgres` Docker volume.
- Review CORS, firewall rules, and reverse proxy headers for your environment.

## License

Ledger is released under the MIT License. See `LICENSE`.
