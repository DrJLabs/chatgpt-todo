# chatgpt-todo-app - Technical Specification

**Author:** drj
**Date:** 2025-10-16
**Project Level:** 1
**Project Type:** infrastructure/devops
**Development Context:** Brownfield

---

## Source Tree Structure

- `client/.env.example` · new/updated template documenting `VITE_AUTH_BASE_URL`, `VITE_MCP_METADATA_URL`, and `VITE_TODO_API_BASE_URL` with production defaults and local override notes.
- `client/src/authClient.js` · Better Auth bootstrap exporting singleton `useSession`, `signIn`, and `signOut` helpers.
- `client/src/components/AuthGate.jsx` · gate component wrapping the todo UI, handling loading/error/unauthenticated states with Better Auth hooks.
- `client/src/components/SignInWithGoogle.jsx` · reusable button that invokes `signIn.social({ provider: 'google' })`.
- `client/src/lib/api.js` · fetch helper that prefixes `VITE_TODO_API_BASE_URL`, sets `credentials: 'include'`, and normalizes errors.
- `client/src/App.jsx` · refactored to use `AuthGate`, the API helper, and sign-out control.
- `client/src/main.jsx` · imports `authClient` once to share the singleton across hooks.
- `client/src/index.css` (optional) · styles for auth gate components.
- `server/.env.example` · updated template including `AUTH_BASE_URL`, `AUTH_MCP_METADATA_URL`, `TODO_API_BASE_URL`, and `TRUSTED_ORIGINS`.
- `server/session.js` · middleware enforcing Better Auth session on REST + MCP routes.
- `server/mcpMetadata.js` · utility for fetching and caching metadata from the central auth server.
- `server/index.js` · integrates env vars, strict CORS, session middleware, metadata proxy, and MCP auth guard.
- `docs/better-auth-integration-plan.md` · merged comprehensive integration guide aligned with official docs.
- `better-auth-integration-plan.updated.md` · deprecated or converted into redirect to the canonical doc.

---

## Technical Approach

- **Auth client integration**: Instantiate `createAuthClient` from `better-auth/react` with `baseURL` sourced from `VITE_AUTH_BASE_URL`, exporting singleton helpers (`useSession`, `signIn`, `signOut`) so every component shares one SDK instance.
- **UI gating**: Wrap the todo interface with `AuthGate` that uses `useSession` to block until the Better Auth session is loaded, render a branded Google sign-in button via `signIn.social`, and expose sign-out through the SDK.
- **API abstraction**: Replace hard-coded `fetch('http://localhost:3000/...')` calls with an `apiClient` helper that prepends `VITE_TODO_API_BASE_URL`, includes credentials, and converts 401s into re-auth prompts.
- **Server protection**: Apply `requireSession` middleware to all REST and MCP routes, forwarding cookies to `AUTH_BASE_URL + '/session'`; reject unauthenticated requests with 401 before they reach business logic.
- **MCP metadata**: Serve `GET /mcp` as a thin proxy to `AUTH_MCP_METADATA_URL` and gate `POST /mcp` with `requireSession`, so ChatGPT Apps discovery happens against the central Better Auth instance while token exchange occurs via the todo server.
- **CORS tightening**: Configure Express CORS to allow only `TODO_API_BASE_URL` and `AUTH_BASE_URL` origins with `credentials: true`, mirroring Better Auth cookie guidance to keep session cookies secure across subdomains.

---

## Implementation Stack

- **Authentication SDK**: `better-auth@1.3.27` React client (`better-auth/react`) pinned via package.json, aligned with official `client.mdx` guidance.
- **Frontend framework**: Vite 5 + `react@18.3.1` / `react-dom@18.3.1` (existing) with Tailwind-style utility classes already present.
- **HTTP utilities**: Native `fetch` wrapped in project-level helper; all requests set `credentials: 'include'` to comply with Better Auth cookie requirements.
- **Server runtime**: Node.js `20.12.2` LTS with Express `4.19.2`, relying on built-in `fetch`; fallback to `node-fetch@3.3.2` only if older Node is required.
- **Environment management**: `dotenv@16.4.5` on the server, Vite `VITE_*` vars on the client; production secrets managed outside repo per `.env.example`.
- **MCP transport**: `@modelcontextprotocol/sdk@0.5.0` server with `StreamableHTTPServerTransport`, now sitting behind auth middleware.

---

## Technical Details

### Client auth lifecycle
- Bootstrap the Better Auth client in `client/src/authClient.js`:
  ```ts
  import { createAuthClient } from 'better-auth/react';

  export const auth = createAuthClient({
    baseURL: import.meta.env.VITE_AUTH_BASE_URL!,
    fetch: (input, init) =>
      fetch(input, { ...init, credentials: 'include' }),
  });

  export const { useSession, signIn, signOut } = auth;
  ```
- `AuthGate` uses `useSession()` to block rendering until the hook returns `{ user }`. While pending, keep UI blank; on error, show retry; on unauthenticated, surface Google sign-in.
- Google sign-in triggers `signIn.social({ provider: 'google', fetchOptions: { credentials: 'include' } })` to align with official OAuth guidance.
- Sign-out dispatches `await signOut({ fetchOptions: { credentials: 'include' } })` and refreshes the session hook.

### Existing server baseline & compatibility checkpoints
- Current behaviour (pre-integration):
  - `client/src/App.jsx` calls `fetch('http://localhost:3000/tasks')` without credentials; server responds with in-memory task list.
  - `server/index.js` exposes `GET /tasks`, `POST /tasks`, `POST /tasks/:id/complete`, and `POST /mcp` without auth or CSRF protection.
  - CORS headers are wildcard (`*`) and MCP discovery is not exposed via `GET /mcp`.
- Compatibility considerations:
  - Preserve task JSON schema (`{ id, text, completed }`) so existing MCP tools and UI remain functional post-auth.
  - Ensure new auth middleware returns 401 (not 403/500) when cookies are missing to avoid breaking ChatGPT task tooling.
  - Confirm MCP POST handler still streams responses after auth guard by validating with the existing `createTask` / `getTasks` tools.
  - Maintain static asset serving from `client/dist` so unauthenticated browsers still load the sign-in gate.

### API client refactor
- Extract all REST calls into `client/src/lib/api.js`:
  ```ts
  const API_BASE = import.meta.env.VITE_TODO_API_BASE_URL;

  export async function apiFetch(path, init = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
      ...init,
    });
    if (res.status === 401) {
      throw new Error('unauthenticated');
    }
    if (!res.ok) throw new Error(`API error ${res.status}`);
    return res.status === 204 ? null : res.json();
  }
  ```
- Update task operations to call `apiFetch('/tasks')`, `apiFetch('/tasks', { method: 'POST', body: JSON.stringify(...) })`, etc., and catch 401 to trigger re-auth (e.g., via `auth.signIn`).

### Server session enforcement
- `server/session.js`:
  ```js
  export async function requireSession(req, res, next) {
    try {
      const response = await fetch(`${process.env.AUTH_BASE_URL}/session`, {
        headers: { cookie: req.headers.cookie ?? '' },
        credentials: 'include',
      });
      if (!response.ok) return res.status(401).json({ error: 'unauthenticated' });
      req.session = await response.json();
      next();
    } catch (err) {
      console.error('Session check failed', err);
      res.status(401).json({ error: 'unauthenticated' });
    }
  }
  ```
- Apply to all REST routes and `POST /mcp`; pass through to MCP transport only after session validation.

### MCP metadata proxy
- Add `GET /mcp` route:
  ```js
  import { readFileSync } from 'node:fs';
  import { fetch } from 'node-fetch'; // Node <18 fallback

  let cachedMetadata;
  app.get('/mcp', async (req, res) => {
    if (!cachedMetadata || Date.now() - cachedMetadata.cachedAt > 5 * 60 * 1000) {
      const resp = await fetch(process.env.AUTH_MCP_METADATA_URL);
      if (!resp.ok) return res.status(502).json({ error: 'metadata_unavailable' });
      cachedMetadata = {
        cachedAt: Date.now(),
        payload: await resp.json(),
      };
    }
    res.json(cachedMetadata.payload);
  });
  ```
- Document caching strategy (5-minute TTL) to avoid hammering central server.

### CORS & transport
- Update Express CORS:
  ```js
  const allowedOrigins = process.env.TRUSTED_ORIGINS?.split(',') ?? [];
  app.use(cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, origin);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  }));
  ```
- Remove wildcard headers; ensure `Access-Control-Allow-Origin` echoes request origin when allowed and `Access-Control-Allow-Credentials: true`.

---

## Development Setup

- **Environment files**
  - `client/.env.local`: set `VITE_AUTH_BASE_URL`, `VITE_MCP_METADATA_URL`, `VITE_TODO_API_BASE_URL`; provide `.env.example` with placeholders and instructions to copy for dev/prod.
  - `server/.env`: define `PORT`, `AUTH_BASE_URL`, `AUTH_MCP_METADATA_URL`, `TODO_API_BASE_URL`, `TRUSTED_ORIGINS`. Update `.env.example`.
- **Local overrides**
  - For dev, point `VITE_AUTH_BASE_URL` to staging (`https://auth.onemainarmy.com/api/auth`) or local tunnel; if running auth locally, update to `http://localhost:PORT/api/auth` and adjust `TRUSTED_ORIGINS`.
  - Use `npm run dev -- --host` in `client/` to expose on LAN if testing cookies across devices.
- **Bootstrap commands**
  ```bash
  # install dependencies
  npm install
  npm --prefix client install
  npm --prefix server install

  # run client
  npm --prefix client run dev

  # run server (loads MCP + REST)
  npm --prefix server run dev
  ```
- **Cookie troubleshooting**
  - Ensure browser allows third-party cookies or test from `https://todo.onemainarmy.com`.
  - For localhost, expect `SameSite=None; Secure` cookies to require HTTPS; use `mkcert` / local tunneling if necessary.

---

## Implementation Guide

1. **Update environment templates**
   - Add new variables to `client/.env.example` and `server/.env.example`, including comments about production values and local overrides.
2. **Install Better Auth client SDK**
   - Run `npm --prefix client install better-auth` (or equivalent package manager) and lock the version.
3. **Create auth bootstrap (`client/src/authClient.js`)**
   - Instantiate `createAuthClient` with `baseURL` from env; export session/sign-in/sign-out helpers.
4. **Add `AuthGate` and session-aware UI**
   - Create `client/src/components/AuthGate.jsx`, render sign-in card when `useSession` has no user, and wrap `<App />` contents in `AuthGate`.
   - Provide a dedicated Google sign-in button that calls `signIn.social`.
5. **Refactor API calls**
   - Introduce `client/src/lib/api.js` and update task CRUD functions to use it.
   - Handle `Error('unauthenticated')` by prompting re-auth (e.g., show sign-in banner).
6. **Tighten fetch usage**
   - Replace direct `fetch('http://localhost:3000/...')` strings with `apiFetch`.
   - Ensure every request sets `credentials: 'include'`.
7. **Server session middleware**
   - Implement `server/session.js`, import in `server/index.js`, and apply to `/tasks` routes and `POST /mcp`.
   - Log errors with minimal detail to avoid leaking tokens.
8. **Expose MCP metadata**
   - Add `GET /mcp` in `server/index.js` that proxies `AUTH_MCP_METADATA_URL`, with caching and 502 fallback.
9. **Configure CORS**
   - Replace wildcard CORS with configured origins; ensure `Access-Control-Allow-Credentials: true`.
10. **Document updates**
    - Merge `better-auth-integration-plan.updated.md` into `docs/better-auth-integration-plan.md`.
    - Link tech spec sections to the consolidated guide.
11. **Plan backward compatibility & rollout guardrails**
    - Introduce a temporary env flag (`ENABLE_AUTH_GATE`) so the UI can fall back to legacy unauthenticated mode if sign-in blocks usage during rollout.
    - Schedule regression verification of existing MCP flows (`createTask`, `getTasks`, `completeTask`) both before and after enforcing auth.
    - Add rollback notes to the server README covering how to disable `requireSession` quickly if central auth is unavailable.
12. **Manual verification**
    - Start server/client, sign in via Google, verify tasks fetch/mutate with session cookies, hit `/mcp` to confirm metadata proxy.
13. **Hand-off & ownership**
    - Update `docs/bmm-workflow-status.md` progress, attach artifacts for PM/SM follow-up.
    - Assign **Auth Ops** to keep Google OAuth redirect URIs and Better Auth `trustedOrigins` aligned with domain changes.
    - Assign **Infrastructure** to manage DNS/SSL and production env variable rotations.
    - Assign **Product Engineering** to maintain the consolidated Better Auth guide and coordinate MCP client updates.

---

## Testing Approach

- **Client auth smoke**
  - Mock `fetch` to simulate 401 → ensure `AuthGate` shows sign-in state.
  - After `signIn.social` resolves (can be stubbed), confirm `useSession` re-renders with user and tasks load.
- **API helper**
  - Unit-test `apiFetch` (e.g., Vitest) to assert base URL concatenation, credential inclusion, and error throwing on 401/500 responses.
- **Server middleware**
  - Add integration tests (Jest or Supertest) that call `/tasks` without cookies (expect 401) and with mocked session response (expect 200).
- **MCP endpoint**
  - Simulate POST `/mcp` with/without session; expect 401 vs. successful streaming handshake.
- **Manual end-to-end**
  - Run client + server, perform Google sign-in, create/read/complete tasks, and confirm MCP discovery (`curl https://todo.onemainarmy.com/mcp`) returns proxied metadata.
- **Regression checklist**
  - Confirm sign-out clears session and tasks fetch returns 401.
  - Test from both production domains to verify cookies travel; document results.
  - Toggle `ENABLE_AUTH_GATE` off to ensure legacy unauthenticated flows still operate during rollback drills.

---

## Deployment Strategy

- **Configuration promotion**
  - Ensure `VITE_*` env vars are set in hosting platform (e.g., Vercel, Netlify) to production URLs; set `AUTH_*` vars for the Express host.
  - Align DNS so `todo.onemainarmy.com` and `auth.onemainarmy.com` serve over HTTPS with valid certificates; update Better Auth `trustedOrigins` if subdomains change.
- **Zero-downtime rollout**
  - Deploy server changes first (so `/mcp` proxy and session middleware are present), then client changes; both can ship independently due to feature flagless integration.
  - Monitor logs for session validation failures; add temporary WARN logs when 401s spike to catch misconfigured cookies.
- **Rollback considerations**
  - Keep old unauthenticated flow behind a short-lived feature flag (e.g., environment toggle) if immediate rollback is required; otherwise revert to previous commit and redeploy.
- **Post-deploy validation**
  - Confirm Google OAuth redirect still matches central config.
  - Test MCP discovery from ChatGPT plugin registration; ensure metadata points to `auth.onemainarmy.com`.
- **Documentation sync**
  - Update `docs/deployment.md` (or create section) summarizing env vars and smoke steps.
- **Observability & metrics**
  - Add dashboard panels for: (a) auth session success rate (`200 /session` responses vs total), (b) MCP 401/403 counts, (c) task API latency percentiles.
  - Configure alerts: warn if MCP 401s exceed 5% for 10 minutes or if auth success rate drops below 95%.
  - Capture structured logs including `userId`, `route`, and `authState` (no PII) to aid brownfield regression triage.
  - Responsibilities documented in deployment runbook (Auth Ops, Infrastructure, Product Engineering) alongside regression evidence.

---

_This tech spec is for Level 0-2 projects (BMad Method v6). It provides the technical details needed for implementation. Level 3+ projects use the separate architecture workflow for comprehensive technical design._
