# Deployment Guide — chatgpt-todo-app

## Overview
The project provides two Node.js services in a single repository:
- `client/`: React + Vite SPA bundled for the MCP widget.
- `server/`: Express server exposing REST endpoints and MCP tools, and serving the built client assets from `client/dist`.

There is currently **no production deployment pipeline** or process automation; all configuration is oriented around local development.

## Frontend Build (Vite)
1. Install dependencies: `npm install` in `client/`.
2. Build static assets: `npm run build` → outputs to `client/dist/`.
3. The Express server reads `client/dist/index.html` to register the MCP widget resource.

### Vite Config Highlights
- `client/vite.config.js` reads the `base` URL from `VITE_CLIENT_BASE` (defaults to `'/'`) so builds can target custom prefixes.
- Plugins: `@vitejs/plugin-react` and `@tailwindcss/vite` for Tailwind integration.

## Tailwind CSS
- Tailwind config at `client/tailwind.config.js` scans `index.html` and all files under `src/`.
- Styling is utility-class driven; no separate CSS frameworks.

## Server Runtime
1. Install dependencies: `npm install` in `server/`.
2. Start server: `npm run start` (or `npm run dev` with Node `--watch`).
3. Server listens on `http://localhost:3000` by default.
4. Endpoints: `/tasks`, `/tasks/:id/complete`, `/mcp`, and static hosting for `client/dist`.

## Environment & Configuration
- Application configuration is driven by env files that should be created from the provided examples:
  - `client/.env.example` → `client/.env.local` for client-facing values (`VITE_AUTH_BASE_URL`, `VITE_MCP_METADATA_URL`, `VITE_TODO_API_BASE_URL`, optional `VITE_CLIENT_BASE`).
  - `server/.env.example` → `server/.env` for server configuration (`AUTH_BASE_URL`, `AUTH_MCP_METADATA_URL`, `TODO_API_BASE_URL`, `TRUSTED_ORIGINS`, optional `PORT`, optional `ENABLE_AUTH_GATE`).
- The Express server expects Better Auth cookies to be issued from `AUTH_BASE_URL` and will proxy MCP discovery via `AUTH_MCP_METADATA_URL`.
- Ensure the production deployment exposes `/mcp` on the todo domain and that CORS `TRUSTED_ORIGINS` includes both the widget host and any admin origins.
- Keep `ENABLE_AUTH_GATE` + `VITE_ENABLE_AUTH_GATE` set to `true` under normal operation; only disable them to roll back authentication if advised in the runbook.

## Current Limitations
- Data is in-memory; restarting the server loses all tasks.
- No CI/CD or containerization described; deployment must be scripted manually.
- No HTTPS/TLS configuration in code; reverse proxy or hosting platform must handle it.

## Recommended Next Steps
1. Harden environment management (secret storage, production overrides for `VITE_*`, `AUTH_*`, `TRUSTED_ORIGINS`).
2. Package the application (Docker or PM2) for predictable deployment.
3. Implement persistence (database) before production launch; update server to externalize task storage.
4. Configure Better Auth credentials and verify cross-origin cookie requirements (`SameSite=None; Secure`) in production domains.
5. Set up CI (GitHub Actions) to run lint/build and produce artifacts for deployment.

## Better Auth Rollout Runbook
1. **Feature flag check** – Confirm `VITE_ENABLE_AUTH_GATE`/`ENABLE_AUTH_GATE` are `true` prior to rollout; note the emergency rollback procedure (set both to `false`, redeploy).
2. **Regression matrix** – With flags `true` and `false`, exercise:
   - Client widget read/write (`/tasks` via UI)
   - REST API via curl or Postman
   - MCP tools (`createTask`, `getTasks`, `completeTask`)
   - Record outcomes in the deployment guide or linked runbook (e.g., 2025-10-16 smoke run: all scenarios passed, 401s returned only when expected).
3. **Ownership**
   - Auth Ops: Google OAuth redirect URIs, Better Auth `trustedOrigins`.
   - Infrastructure: DNS/SSL updates, production env variable rotation.
   - Product Engineering: Docs maintenance, MCP client updates, regression evidence.
4. **Observability**
   - Dashboards tracking auth session success rate, MCP 401/403, and task latency (Grafana/DataDog).
   - Alerts warning if auth success <95% for 10 minutes or MCP 401s >5%.
   - Structured logging capturing anonymised `userId`, `route`, `authState` for incident triage.
5. **Post-deploy review** – Update this guide with regression results, note any anomalies, and confirm dashboards/alerts fire during synthetic tests.
