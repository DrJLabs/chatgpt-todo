# Architecture — chatgpt-todo-app

## Executive Summary
`chatgpt-todo-app` is a simple monolithic web project that pairs a React 19 single-page application with an Express 5 backend that also implements Model Context Protocol (MCP) tooling. The build pipeline relies on Vite 7 and Tailwind CSS for rapid UI iteration, while the server exposes both REST endpoints and MCP resources so the same task list can be manipulated via ChatGPT or the embedded widget. Persistence is still in-memory, but Better Auth integration now guards every endpoint and stores tasks per user whenever the feature flag is enabled.

## Technology Stack
- **Frontend:** React 19.1.1, Vite 7.1.7, Tailwind CSS 4.1, custom hook `useOpenAiGlobal` leveraging `useSyncExternalStore`.
- **Backend:** Express 5.1.0, `@modelcontextprotocol/sdk` 1.19.1, Zod 3.25.76, CORS middleware, static hosting of `client/dist`.
- **Tooling:** ESLint (React hooks + refresh presets), ngrok (for exposing `/mcp` to ChatGPT), env-driven configuration via `VITE_*`, `ENABLE_AUTH_GATE`, and `TRUSTED_ORIGINS`.

## Architecture Pattern
- Monolithic SPA + API served from a single Node.js project.
- SPA assets built via Vite and served by Express; server also registers MCP tools and widget resource.
- No separate microservices or data tier today.

## Data Architecture
- Tasks stored in in-memory collections inside `server/index.js`: per-user arrays when `ENABLE_AUTH_GATE=true`, or a legacy shared array when the flag is disabled for rollback.
- No ORM or database; all data is lost on server restart.
- Future work: add persistent store tied to Better Auth user IDs (as outlined in `docs/better-auth-integration-plan.md`).

## API Design
- REST endpoints:
  - `GET /tasks` — returns all tasks.
  - `POST /tasks` — creates a task (expects `{ text: string }`).
  - `POST /tasks/:id/complete` — marks a task complete.
- MCP tooling mirrors REST behaviour with `createTask`, `getTasks`, and `completeTask`; responses include metadata for ChatGPT widget rendering.
- Better Auth session middleware enforces authentication; CORS echoes only trusted origins and always enables credentialed requests.

## Component Overview (Client)
- `App.jsx` — renders dashboard, handles CRUD operations via fetch, displays progress bar.
- `useOpenAiGlobal.js` — custom hook bridging MCP global state to React components.
- Styling entirely via Tailwind utility classes; assets limited to a placeholder SVG.

## Source Tree (Summary)
- `client/src/` — SPA source (App, main, hook, Tailwind import, assets).
- `server/` — Express server exposing REST + MCP.
- `docs/` — Generated documentation and integration plans (API contracts, auth rollout, etc.).
- `bmad/` — BMAD workflow engine files.

(See `docs/source-tree-analysis.md` for annotated tree.)

## Development Workflow
- Install dependencies (`npm install` in root/server/client).
- Build client: `cd client && npm run build`.
- Run server: `cd server && npm run dev` (serves built assets and MCP endpoints).
- Optional: expose via `ngrok http 3000` for ChatGPT integration.
- No automated tests; linting via `client/npm run lint`.

## Deployment Architecture
- Manual/development only: build client then run Express server locally.
- Vite config reads `VITE_CLIENT_BASE` for its base path; no production deployment pipeline or CI/CD automation yet.
- No containerization, process manager, or infra-as-code defined.

## Testing Strategy
- Automated tests absent (`*.test.*` and `__tests__` not found).
- Recommendation: add Jest/Vitest for component and server route coverage once persistence/auth layers are added.

## Risks & Next Steps
1. **Persistence** — introduce a database and migrate REST/MCP endpoints to durable per-user storage.
2. **Authentication** — monitor Better Auth in production; protect rollback flags (`ENABLE_AUTH_GATE`, `VITE_ENABLE_AUTH_GATE`) from accidental toggles.
3. **Configuration** — harden environment management (secrets rotation, production overrides for `VITE_*`, `AUTH_*`, `TRUSTED_ORIGINS`).
4. **CI/CD** — establish GitHub Actions or equivalent for lint/build/test and deployment automation.
5. **Testing** — add unit/integration tests for both client and server before production usage.
