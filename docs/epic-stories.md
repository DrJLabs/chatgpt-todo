# Epic and User Stories - Level 1

**Project:** chatgpt-todo-app
**Level:** Level 1 (Coherent Feature)
**Date:** 2025-10-16
**Author:** drj

---

## Epic Overview

### Epic: Centralized Better Auth Protection

**Goal:** Require Better Auth sign-in across the todo UI and MCP server so only authorized users can view or mutate tasks.

**Scope:** Implement the Better Auth React client, gate the Vite UI, refactor REST calls, and secure Express + MCP endpoints with centralized session validation and metadata proxying. Operational safeguards, documentation updates, and observability baselines are included; data-model or task feature work is out of scope.

**Success Criteria:**
- Todo client refuses to load task data until a Better Auth session is present.
- Express `/tasks` and MCP `/mcp` endpoints return `401` for unsigned requests and succeed with valid cookies.
- `/mcp` metadata served from auth.onemainarmy.com via the todo server matches the central Better Auth discovery payload.
- Feature flag and rollback path documented; Auth/Ops owners aligned on deployment responsibilities.
- Auth and MCP error/latency metrics visible on dashboards with alerts.

**Dependencies:** Central Better Auth deployment at `https://auth.onemainarmy.com`, Google OAuth credentials with callback registered, and production DNS/SSL for `todo.onemainarmy.com`.

**Story Count:** 3 (8 points)

---

## Story Files Generated

This workflow generates 3 story files in the following format:

- `story-centralized-better-auth-1.md`
- `story-centralized-better-auth-2.md`
- `story-centralized-better-auth-3.md`

**Location:** `docs/stories/`

**Next Steps:**

1. Run story-context workflow on story 1
2. Run dev-story workflow to implement story 1
3. Repeat for stories 2, 3, etc.

---

## Story Summaries

### Story 1: Gate the Todo UI behind Better Auth

**File:** `story-centralized-better-auth-1.md`

**User Story:**
As a todo user,
I want the widget to require Better Auth sign-in,
so that only authorized sessions can read or mutate tasks.

**Acceptance Criteria Summary:**
- Better Auth React client instantiated with production-ready env vars and shared singleton.
- UI renders AuthGate and Google sign-in until `useSession` returns a user; sign-out clears session and returns to gate.
- API helper wraps all task requests, uses `credentials: 'include'`, and maps 401s to re-auth prompts.
- Client `.env` templates updated with auth and MCP metadata variables.

**Story Points:** 3

**Dependencies:** None.

---

### Story 2: Secure Express API and MCP endpoints

**File:** `story-centralized-better-auth-2.md`

**User Story:**
As an operations owner,
I want the todo server to enforce Better Auth before serving REST or MCP traffic,
so that unauthorized requests fail consistently while valid sessions succeed.

**Acceptance Criteria Summary:**
- `requireSession` middleware validates Better Auth cookies and guards `/tasks` and `POST /mcp`.
- `/mcp` proxy caches metadata from the central server and returns 502 on upstream failure.
- CORS configuration restricts origins, supports credentials, and removes wildcard headers.
- Server `.env` template documents new variables; MCP behavior verified post-auth.

**Story Points:** 3

**Dependencies:** Depends on Story 1 for shared env variable definitions and client credential usage.

---

### Story 3: Operationalize Better Auth rollout and observability

**File:** `story-centralized-better-auth-3.md`

**User Story:**
As the platform team,
I want guardrails and monitoring around the Better Auth rollout,
so that we can deploy safely, roll back quickly, and detect auth regressions.

**Acceptance Criteria Summary:**
- `ENABLE_AUTH_GATE` flag enables legacy unauthenticated mode for emergency rollback.
- Regression checklist executed for MCP tools and task flows with and without the flag.
- Ownership matrix recorded for Auth Ops, Infrastructure, and Product Engineering tasks.
- Dashboards and alerts established for auth success rate, MCP 401/403 counts, and task latency.

**Story Points:** 2

**Dependencies:** Depends on Stories 1 and 2 for completed implementation to monitor.

---

## Story Map

```text
Epic: Centralized Better Auth Protection
├── Story 1: Gate the Todo UI behind Better Auth (3 points)
├── Story 2: Secure Express API and MCP endpoints (3 points)
└── Story 3: Operationalize Better Auth rollout and observability (2 points)
```

**Total Story Points:** 8
**Estimated Timeline:** ~1.5 weeks (assuming single engineer with support from ops/infra for hand-off)

---

## Implementation Sequence

1. Complete Story 1 to establish the Better Auth client, UI gate, and env scaffolding.
2. Complete Story 2 to guard server APIs, proxy MCP metadata, and tighten CORS.
3. Complete Story 3 to validate rollback plan, finalize documentation, and light up observability.

---

## Technical References

- **Tech Spec:** `docs/tech-spec.md` - Technical source of truth
- **Architecture:** `docs/architecture.md`, `docs/deployment-guide.md`

---

_Generated as part of Level 1 Tech Spec workflow (BMad Method v6)_
_This is a summary document. Actual story files are generated in `docs/stories/`_
