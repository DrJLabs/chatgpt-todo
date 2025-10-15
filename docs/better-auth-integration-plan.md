# Better Auth Integration Plan

## Background
- **Current app**: Express MCP server in `server/index.js` exposes todo CRUD endpoints and MCP tools, stores tasks in-memory, and serves the React widget from `client/dist`.
- **Client**: Vite/React app in `client/src/App.jsx` talks to the server with hard-coded `http://localhost:3000` fetch calls and has no authentication or session awareness.
- **Target**: Integrate with the central Better Auth server already running at `http://localhost:25000` so that both the REST APIs and MCP tools require authenticated users and respect user identity.

## Goals
- Enforce Better Auth sign-in before allowing reads/writes to todo data (HTTP or MCP).
- Reuse the existing central server for session issuance, user storage, and login flows (no embedded Better Auth instance here).
- Preserve compatibility with the ChatGPT widget flow and local development ergonomics.

## Key References
- Better Auth Express guide – handler mounting, CORS, and `auth.api.getSession` usage. <!-- express.mdx -->
- Better Auth client guide – `createAuthClient` and `baseURL` usage for React. <!-- client.mdx -->
- Better Auth configuration options – `baseURL`, `basePath`, `trustedOrigins`, `crossOriginCookies`. <!-- options.mdx, cookies.mdx -->
- Installation doc – `.env` expectations (`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, database configuration). <!-- installation.mdx -->

## Phase 1 – Align Central Server Configuration
1. **Document the central instance**
   - Confirm its public base URL (`http://localhost:25000` during dev) and routed path (default `/api/auth`).
   - Record enabled auth flows (email/password, social providers, etc.) so the client UI can surface the right actions.
2. **Trusted origins & cookies**
   - Add `http://localhost:3000` (and eventual production domain) to `trustedOrigins`.
   - Enable `advanced.crossOriginCookies` (or sub-domain equivalent) so session cookies survive the `localhost:25000` → `localhost:3000` origin boundary.
   - Keep `SameSite=None` + `Secure` in non-local environments; during local dev use Better Auth’s local override or manual cookie attributes.
3. **CORS policy**
   - Ensure the central server responds with `Access-Control-Allow-Origin` for the widget origin and allows credentials. (Reference: Better Auth Express doc CORS callout.)
4. **Environment hygiene**
   - Verify `.env` on the auth server exposes `BETTER_AUTH_URL=http://localhost:25000` and rotates `BETTER_AUTH_SECRET` as needed.

## Phase 2 – Server (MCP) Integration
1. **Dependencies**
   - Add `better-auth` (for shared helpers) and, if preferred, `better-fetch` for typed API calls.
2. **Session verification middleware**
   - Create a module (e.g., `server/session.js`) that:
     - Forwards incoming request cookies to `${process.env.AUTH_BASE_URL}/session` (or equivalent) using `fetch` with `credentials: 'include'`.
     - Alternatively reuses `auth.api.getSession` once we expose the central instance through a lightweight proxy module.
     - Caches successful session lookups per request to avoid duplicate round-trips.
   - Apply middleware to REST endpoints (`/tasks`, `/tasks/:id/complete`) and inside MCP tool handlers so each tool call checks `session.user`.
3. **Per-user task storage**
   - Replace the global `tasks` array with a user-scoped store that reuses the SQLite database the central Better Auth instance already maintains:
     - Instead of provisioning a second database file, point the todo service at the existing connection string (shared `.env` variable) and add a `tasks` table keyed by `userId`.
     - Wrap reads/writes behind a `TaskRepository` module that loads once on server boot and exposes per-user helpers (`listTasks(userId)`, `upsertTask(userId, task)`).
     - Keep repository methods transactional so the schema can migrate alongside the central auth schema (e.g., when moving both to Postgres) without changing application code.
   - Document migration steps with the auth ops team before altering the shared schema, especially if multiple services will begin reading from the same database file.
   - Update REST endpoints and MCP structured outputs to respect per-user data.
4. **CORS & cookie forwarding**
   - Adjust Express CORS middleware to `origin: ['http://localhost:3000', /* prod */]`, `credentials: true`.
   - Ensure MCP HTTP transport forwards headers (especially cookies) when ChatGPT invokes tools; audit `StreamableHTTPServerTransport` usage.
5. **Error handling**
   - Return 401/403 responses when session validation fails; surface actionable errors in MCP tool results.
6. **Configuration**
   - Introduce environment variables in this repo (`AUTH_BASE_URL` for the server, `VITE_AUTH_BASE_URL` for the Vite client, plus `TODO_API_BASE_URL`) so local/prod URLs are configurable.
7. **Logging & observability**
   - Log failed validations (without leaking secrets) and include correlation ids from Better Auth responses when available.

## Phase 3 – Client Integration
1. **Install client SDK**
   - Add `better-auth` client for React (`import { createAuthClient } from 'better-auth/react'`).
   - Instantiate with `baseURL: import.meta.env.VITE_AUTH_BASE_URL ?? 'http://localhost:25000/api/auth'`.
2. **Auth context/provider**
   - Create `client/src/authClient.js` exporting the configured client plus hooks (`useSession`, `signIn`, `signOut`).
   - Wrap `<App />` with a provider (or update component to call the hooks directly).
3. **UI updates**
   - Add an auth panel showing current user, sign-in methods, and sign-out.
   - Prompt unauthenticated users to sign in before showing or mutating tasks.
4. **Fetch updates**
   - Switch REST calls to `fetch('/tasks', { credentials: 'include' })` via relative URLs; rely on the same Express origin to avoid extra preflights.
   - After tile loads, `useEffect` should gate `fetchTasks` on `session?.user`.
5. **ChatGPT widget considerations**
   - Confirm the widget can open Better Auth flows (may require rendering sign-in inside `<iframe>` or open a new window). Document fallback (manual sign-in via shared browser tab).
   - Ensure the widget re-fetches session after sign-in events (`authClient.on('session', ...)` or `useSession` hook).

## Phase 4 – Security & Compliance
- Enforce HTTPS when moving beyond localhost; update `AUTH_BASE_URL` accordingly and enable secure cookies.
- Audit Better Auth scopes/plugins so only necessary endpoints are exposed to this app.
- Add CSRF mitigation notes: rely on Better Auth’s trusted origins; avoid leaking session cookies to arbitrary scripts.
- Record data retention strategy for task records if synced with central auth user deletion hooks.

## Phase 5 – Testing & Rollout
1. **Unit / integration**
   - Add tests for session middleware (mock Better Auth responses) and per-user task isolation.
   - Ensure MCP tool tests cover unauthorized access paths.
2. **Manual QA**
   - Local smoke: sign in via Better Auth, create/complete tasks via UI and ChatGPT, sign out and confirm access revoked.
   - Regression: verify ChatGPT widget still renders after authentication redirects.
3. **Deployment readiness**
   - Document new environment variables.
   - Prepare rollout checklist (including Better Auth server config changes).
4. **Monitoring**
   - Define minimal metrics (failed validations, sign-in success rate) and where to surface them (logs/Dashboard).

## Open Questions & Follow-ups
- Does the central Better Auth server expose a REST session introspection endpoint, or should this service host a thin proxy that imports the shared config?
- Who owns the shared SQLite schema changes (auth team vs. app team) and what review process is required before adding the todo tables?
- How will ChatGPT-hosted widgets handle Better Auth popups (do we need a separate sign-in portal exposed outside the widget)?
- Production domain(s) and TLS termination details remain to be confirmed before finalizing cookie settings.
