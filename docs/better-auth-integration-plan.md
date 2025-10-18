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
     - Forwards incoming request cookies to `${process.env.AUTH_BASE_URL}/session` (or equivalent) using `fetch` plus an explicit `cookie` header.
     - Alternatively reuses `auth.api.getSession` once we expose the central instance through a lightweight proxy module.
     - Caches successful session lookups per request to avoid duplicate round-trips.
    - Apply middleware to REST endpoints (`/tasks`, `/tasks/:id/complete`) and inside MCP tool handlers so each tool call checks `session.user`.
    - Guard the upstream request with an `AbortController` (5s timeout) and sanitise logging so sensitive data is not printed.
3. **Per-user task storage**
   - Guard tasks by Better Auth user ID while preserving a feature-flag fallback:
     - Default path stores tasks in-memory per user (`ENABLE_AUTH_GATE=true`).
     - When `ENABLE_AUTH_GATE=false`, revert to legacy global storage and skip auth middleware to facilitate emergency rollback.
   - Document migration steps with the auth ops team before altering the shared schema if/when persistence is introduced.
   - Update REST endpoints and MCP structured outputs to respect per-user data when auth is enabled.
4. **CORS & cookie forwarding**
   - Replace wildcard headers with an allow-list fed by `TRUSTED_ORIGINS` (`origin(origin, callback)` pattern).
   - Ensure MCP HTTP transport forwards headers (especially cookies) when ChatGPT invokes tools; audit `StreamableHTTPServerTransport` usage.
   - Return `403 origin_not_allowed` for disallowed origins to aid debugging.
   - Echo the approved origin and set `Access-Control-Allow-Credentials: true` on every response so Better Auth cookies traverse the browser boundary safely.
5. **Error handling**
   - Return 401/403 responses when session validation fails; surface actionable errors in MCP tool results.
6. **Configuration**
   - Introduce environment variables in this repo (`AUTH_BASE_URL` for the server, `VITE_AUTH_BASE_URL` for the Vite client, plus `TODO_API_BASE_URL`) so local/prod URLs are configurable.
   - Add `TODO_PUBLIC_BASE_URL` when the todo server needs to advertise a different resource identifier in MCP metadata than its REST origin.
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
   - Switch REST calls to an API helper that prefixes `VITE_TODO_API_BASE_URL` and sets `credentials: 'include'` so Better Auth cookies accompany every request.
   - After tile loads, `useEffect` should gate `fetchTasks` on `session?.user`.
5. **ChatGPT widget considerations**
   - Confirm the widget can open Better Auth flows (may require rendering sign-in inside `<iframe>` or open a new window). Document fallback (manual sign-in via shared browser tab).
   - Ensure the widget re-fetches session after sign-in events (`authClient.on('session', ...)` or `useSession` hook).
   - Provide `VITE_ENABLE_AUTH_GATE=false` guidance for demos lacking OAuth access.

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
   - Define minimal metrics (auth session success rate, MCP 401/403, task latency) and surface via dashboards/alerts tracked by the platform team.
   - Capture structured logs with anonymised `userId`, `route`, and `authState` fields for incident triage.
5. **Rollback flag**
   - Document `ENABLE_AUTH_GATE` / `VITE_ENABLE_AUTH_GATE` usage in README and deployment guide so operators can disable Better Auth enforcement without redeploying.

## Open Questions & Follow-ups
- Does the central Better Auth server expose a REST session introspection endpoint, or should this service host a thin proxy that imports the shared config?
- Who owns the shared SQLite schema changes (auth team vs. app team) and what review process is required before adding the todo tables?
- How will ChatGPT-hosted widgets handle Better Auth popups (do we need a separate sign-in portal exposed outside the widget)?
- Production domain(s) and TLS termination details remain to be confirmed before finalizing cookie settings.
