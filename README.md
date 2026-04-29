# Ledger

Ledger is a self-hosted personal finance service with an Angular frontend, Go backend services, and PostgreSQL storage. It is intended for private deployments where the owner controls the application, data, users, and network exposure.

## Repository Layout

- `frontend` - Angular and Angular Material web application.
- `backend` - Go services for authentication, ledger data, and API gateway routing.
- `docker-compose.yml` - Full local self-hosted stack.
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

Default accounts:

- `admin@ledger.local` / `admin`
- `user@ledger.local` / `user`

Change these defaults before exposing the service outside a trusted local network.

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

## Production Notes

This compose file is a practical self-hosted baseline. Before production use:

- Replace default credentials.
- Put the frontend behind HTTPS.
- Restrict direct PostgreSQL access to trusted networks.
- Configure backups for the `ledger-postgres` Docker volume.
- Review CORS, firewall rules, and reverse proxy headers for your environment.

## License

Ledger is released under the MIT License. See `LICENSE`.
