# Ledger Frontend

Angular web application for Ledger, a self-hosted personal finance service. The frontend uses Angular, Angular Material, standalone APIs, strict TypeScript conventions, and a task-focused interface for managing finance data.

## Responsibilities

- Provide the browser UI for authentication, dashboards, statistics, transaction history, incomes, expenses, loans, obligations, settings, and server administration.
- Call the backend through relative `/api/*` endpoints.
- Support local development with Angular CLI and self-hosted deployment through the root Docker Compose stack.

## Requirements

- Node.js compatible with Angular 21.
- npm 11 or newer.
- Running Ledger API gateway on `http://localhost:8080` for local development.

## Setup

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm start
```

Open `http://localhost:4200`. The development server uses `proxy.conf.json` to forward `/api` requests to `http://localhost:8080`.

## Available Scripts

Run tests:

```bash
npm test
```

Build for production:

```bash
npm run build
```

Run a development build in watch mode:

```bash
npm run watch
```

Use the Angular CLI directly:

```bash
npm run ng -- --help
```

## Docker

The root `docker-compose.yml` builds this app with `frontend/Dockerfile`, serves the production bundle with nginx, and proxies `/api/*` to `api-gateway`.

When started through Docker Compose, the frontend is available at `http://localhost:3000` by default. Set `FRONTEND_HOST_PORT` in `.env` to change the host port.

Build the frontend image manually from the repository root:

```bash
docker build -t ledger-frontend ./frontend
```

## Backend Integration

The application expects the backend API gateway to expose:

- `/api/app/config` for system language defaults. Supported language values are `RU` and `EN`.
- `/api/auth/*` for login, logout, session state, profile updates, and password changes.
- `/api/ledger/*` for categories, transactions, loans, and obligations.
- `/api/server/*` for admin user management.

The default local admin is created by the backend:

- `admin@ledger.local` / `admin`

## Development Standards

- Prefer Angular standalone APIs, signals for local state, and Reactive Forms.
- Use Angular Material patterns for navigation, forms, dialogs, tables, feedback, and density.
- Keep layouts responsive across desktop, tablet, and mobile.
- Preserve keyboard navigation, visible focus states, semantic markup, and WCAG AA contrast.

## License

Ledger Frontend is released under the repository MIT License. See `../LICENSE`.
