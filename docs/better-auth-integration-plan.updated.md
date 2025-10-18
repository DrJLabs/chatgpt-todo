# Better Auth Integration Plan — **chatgpt-todo (Client)**

**Scope:** This document updates the client-side plan only (the `chatgpt-todo` repo). The central auth server (`better-auth-central`) is already configured and deployed. We **do not** touch its `.env` or runtime settings here.

> ℹ️ **Summary note:** `better-auth-integration-plan.updated.md` in the repo root carries a condensed version of this guide. Keep both files in sync when workflows change.

---

## What changes now (Best answer)
- **Production Auth Base URL:** `https://auth.onemainarmy.com/api/auth`
- **PRM (Protected Resource Metadata) URL:** `https://auth.onemainarmy.com/.well-known/oauth-protected-resource`
- **Google Sign‑In entrypoint (from client):** `https://auth.onemainarmy.com/api/auth/sign-in/social?provider=google`
- **Google OAuth authorized redirect URI (prereq in Google Cloud):** `https://auth.onemainarmy.com/api/auth/callback/google`

> Everything else in this plan is to wire the client (UI + its small Express server) to the central server without changing server-side configuration.

---

## Background (client-side only)
- **Current app**: Vite/React UI in `client/` and a small Express MCP/REST layer in `server/`.
- **Today**: the UI issues unauthenticated fetch calls and the server exposes endpoints without gating on user identity.
- **Target**: require Better Auth sign-in (Google) before reads/writes, while keeping local dev easy and preserving ChatGPT widget flows.

---

## Prerequisites (already satisfied on central server)
- The auth server is reachable at `https://auth.onemainarmy.com` and exposes:
  - `/.well-known/oauth-authorization-server` and `/.well-known/oauth-protected-resource`
  - `/api/auth/*` routes including `sign-in/social?provider=google` and `session`
- In **Google Cloud Console → OAuth 2.0 Client (Web)**, the **Authorized redirect URI** includes:  
  `https://auth.onemainarmy.com/api/auth/callback/google`

> If any of the above are not yet in place, confirm on the central server. No client-side changes will fix missing discovery or callback registration.

---

## Phase 1 – Environment & dependencies (client)

### ✅ Copy‑ready
Create/update **`client/.env.local`**:
```bash
VITE_AUTH_BASE_URL=https://auth.onemainarmy.com/api/auth
VITE_MCP_METADATA_URL=https://auth.onemainarmy.com/.well-known/oauth-protected-resource
VITE_TODO_API_BASE_URL=https://todo.onemainarmy.com
```

Install the client SDK (if not present):
```bash
# one of the following (mutually exclusive)
pnpm add better-auth
npm i better-auth
yarn add better-auth
```

> We only use the **client** surface from `better-auth` here.

---

## Phase 2 – Client auth bootstrap (React)

### ✅ Copy‑ready
Create **`client/src/auth.ts`**:
```ts
import { createAuthClient } from "better-auth/react";

export const auth = createAuthClient({
  baseURL: import.meta.env.VITE_AUTH_BASE_URL!,
});

export const { useSession, signIn, signOut } = auth;
```

Integrate in your app (example):
```tsx
// client/src/main.tsx or App.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
// import { auth } from "./auth"; // use as needed

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

---

## Phase 3 – Sign‑in UX and session awareness

### ✅ Copy‑ready
Add a Google sign‑in button (link starts the flow on the central server):

Create **`client/src/components/SignInWithGoogle.tsx`**:
```tsx
import { signIn } from "../auth";

export function SignInWithGoogle() {
  return (
    <button
      type="button"
      className="btn"
      onClick={() =>
        signIn.social({
          provider: "google",
          fetchOptions: { credentials: "include" },
        })
      }
    >
      Sign in with Google
    </button>
  );
}
```

Add a minimal session fetch utility for the UI (so the client knows who is signed in):
```ts
// client/src/lib/session.ts
export async function fetchSession() {
  const base = import.meta.env.VITE_AUTH_BASE_URL;
  const r = await fetch(`${base}/session`, {
    credentials: "include",
  });
  if (!r.ok) return null;
  return r.json();
}
```

Use it in a component (example):
```tsx
import { useEffect, useState } from "react";
import { fetchSession } from "../lib/session";
import { SignInWithGoogle } from "./SignInWithGoogle";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    fetchSession().then((s) => { setUser(s?.user ?? null); setLoading(false); });
  }, []);

  if (loading) return null;

  if (!user) return (
    <div style={{ padding: 24 }}>
      <h3>Authentication required</h3>
      <SignInWithGoogle />
    </div>
  );

  return <>{children}</>;
}
```

Wrap protected UI routes with `<AuthGate>`.

> Emergency rollback: set `VITE_ENABLE_AUTH_GATE=false` to bypass the AuthGate while server middleware is disabled (see Phase 4).

---

## Phase 4 – Server (in this repo) session gating

> This affects only the **chatgpt-todo** Express layer (if you call it). It does **not** modify the central server.

### ✅ Copy‑ready
Create **`server/session.js`** (or `.ts`):
```js
export async function requireSession(req, res, next) {
  try {
    const baseUrl = process.env.AUTH_BASE_URL || 'https://auth.onemainarmy.com/api/auth';
    const r = await fetch(`${baseUrl.replace(/\/$/, '')}/session`, {
      headers: { cookie: req.headers.cookie ?? "" },
    });
    if (!r.ok) return res.status(401).json({ error: "unauthenticated" });
    req.session = await r.json();
    next();
  } catch {
    res.status(401).json({ error: "unauthenticated" });
  }
}
```

Mount it on any sensitive routes in **`server/index.js`**:
```js
import express from "express";
import { requireSession } from "./session.js";

const app = express();
app.use(express.json());

app.get("/tasks", requireSession, /* handler */);
app.post("/tasks/:id/complete", requireSession, /* handler */);
// ... other routes

export default app;
```

**Fetch from the UI with cookies included** (example):
```ts
await fetch("/tasks", { credentials: "include" });
```

> Feature flag: `ENABLE_AUTH_GATE=false` bypasses `requireSession` and reverts to global task storage during incidents.

---

## Phase 5 – Testing & rollout (client‑side)

### ✅ Manual checks (prod)
```bash
# Discovery (read-only; verifies central server publishes metadata)
curl -fsS https://auth.onemainarmy.com/.well-known/oauth-authorization-server | jq .issuer,.authorization_endpoint,.token_endpoint
curl -fsS https://auth.onemainarmy.com/.well-known/oauth-protected-resource | jq .resource,.authorization_servers,.jwks_uri

# Session (should return 401 until after sign-in)
curl -i -H "Cookie: <your-browser-cookie>" https://auth.onemainarmy.com/api/auth/session
```

**End-to-end**
1. Load the app (e.g., `http://localhost:5173` in dev).
2. Click **Sign in with Google**; finish consent; you should be redirected back by the central server.
3. Reload the app; `fetchSession()` returns a user; protected UI renders; server routes accept requests with cookies.
4. Toggle `VITE_ENABLE_AUTH_GATE`/`ENABLE_AUTH_GATE` to `false` and re-run the smoke tests to ensure legacy flows remain functional.

**Dev tips**
- For local UI → prod auth, always set `credentials: "include"` on fetch.
- If your browser blocks third‑party cookies, open the auth domain once in a tab to establish trust, or run the UI on a subdomain of `onemainarmy.com` for a first‑party experience in production.
- Capture regression outcomes (auth enforced / bypassed) in the deployment runbook for future releases.

---

## File changes (this repo only)
- `client/.env.local` **(new)** – sets `VITE_AUTH_BASE_URL`, `VITE_MCP_METADATA_URL`, `VITE_TODO_API_BASE_URL`
- `client/src/auth.ts` **(new)** – bootstraps the Better Auth client
- `client/src/components/SignInWithGoogle.tsx` **(new)** – Google entrypoint
- `client/src/lib/session.ts` **(new)** – helper to read session
- `server/session.js` **(new)** – Express middleware to enforce auth
- `server/index.js` **(edit)** – apply `requireSession` to protected routes
- `docs/better-auth-integration-plan.updated.md` **(this file)** – updated to point to `https://auth.onemainarmy.com` and document PRM + flows

---

## Appendices

### Reference URLs (read-only from client)
- OIDC discovery: `https://auth.onemainarmy.com/.well-known/oauth-authorization-server`
- PRM: `https://auth.onemainarmy.com/.well-known/oauth-protected-resource`
- Session: `https://auth.onemainarmy.com/api/auth/session`

### Google OAuth (FYI)
- Authorized redirect URI (in Google Cloud):  
  `https://auth.onemainarmy.com/api/auth/callback/google`

---

**Status:** With the steps above, `chatgpt-todo` uses the central Better Auth for Google sign‑in and session validation without any server‑side configuration changes on `better-auth-central`.
