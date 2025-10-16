# Story: Gate the Todo UI behind Better Auth

Status: Done

## Story

As a todo user,
I want the widget to require Better Auth sign-in,
so that only authorized sessions can read or mutate tasks.

## Acceptance Criteria

- Better Auth React client instantiated in `client/src/authClient.js` using `VITE_AUTH_BASE_URL` and shared singleton exports (`useSession`, `signIn`, `signOut`).
- Auth gate renders while `useSession` loads; unauthenticated users see a Google sign-in CTA that calls `signIn.social({ provider: 'google', fetchOptions: { credentials: 'include' } })`.
- Successful sign-in hydrates session state, unlocks the existing task UI, and sign-out clears cookies then returns to the auth gate.
- All task fetch/mutate calls flow through a new `apiFetch` helper that prefixes `VITE_TODO_API_BASE_URL`, sets `credentials: 'include'`, and surfaces 401s for re-auth prompts.
- `client/.env.example` and local env docs list `VITE_AUTH_BASE_URL`, `VITE_MCP_METADATA_URL`, and `VITE_TODO_API_BASE_URL` with production defaults and local override guidance.

## Tasks / Subtasks

- [x] Install `better-auth@1.3.27` in the client workspace and record the version in `package.json`.
- [x] Create `client/src/authClient.js` with `createAuthClient` configuration and exported hooks.
- [x] Implement `AuthGate` component and sign-in UI, wiring it into `App.jsx` or the root layout.
- [x] Introduce `client/src/lib/api.js` helper and update existing task CRUD calls to use it.
- [x] Update `.env.example`, documentation snippets, and any README references related to client URLs.
- [x] Add minimal styling / UX polish for the sign-in state (loading, error, unauthenticated) per design standards.

## Dev Notes

### Technical Summary

Bootstrap the Better Auth React SDK, ensure all client requests include credentials, and gate the todo interface behind the session hook with explicit sign-in/out flows.

### Project Structure Notes

- Files to modify: client/.env.example; client/src/App.jsx; client/src/authClient.js (new); client/src/components/AuthGate.jsx (new); client/src/components/SignInWithGoogle.jsx (new); client/src/lib/api.js (new); client/src/main.jsx; client/src/index.css (optional styling).
- Expected test locations: client/src/__tests__ (new) or component-level tests alongside files; add smoke coverage for AuthGate behavior if feasible.
- Estimated effort: 3 story points (approximately 3 days, including manual test pass).

### References

- **Tech Spec:** See tech-spec.md for detailed implementation
- **Architecture:** docs/architecture.md, docs/development-guide.md

## Dev Agent Record

### Context Reference

- docs/stories/story-context-centralized-better-auth.1.xml

### Agent Model Used

- GPT-5 (Codex CLI)


### Debug Log References

- 2025-10-16: Reviewed story context and confirmed necessary files (App.jsx, env scaffolding, auth modules) align with requirements.
- 2025-10-16: Verified env-driven API helper and AuthGate wiring against Better Auth docs prior to final validation.


### Completion Notes List

- All acceptance criteria satisfied: auth client bootstrap, session-aware gating, env-driven API helper, and documentation updates.
- Smoke build executed via `npm --prefix client run build`; project compiles successfully with Better Auth integration.
- No automated test harness exists yet; documented need for future Vitest coverage while relying on successful build verification.


### File List

- client/.env.example
- client/package.json
- client/package-lock.json
- client/src/App.jsx
- client/src/authClient.js
- client/src/components/AuthGate.jsx
- client/src/components/SignInWithGoogle.jsx
- client/src/index.css
- client/src/lib/api.js
- client/src/main.jsx
- client/vite.config.js
- README.md
- docs/development-guide.md

### Change Log

- Implemented Better Auth client integration, session gating, API helper, and documentation updates (see File List).

### Completion Notes
**Completed:** 2025-10-16
**Definition of Done:** All acceptance criteria met; npm --prefix client run build executed successfully; awaiting formal review.


---

_Generated as part of Level 1 Tech Spec workflow (BMad Method v6)_
_Story Format: Compatible with story-context and dev-story workflows_
