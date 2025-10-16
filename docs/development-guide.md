# Development Guide — chatgpt-todo-app

## Prerequisites
- Node.js 18+
- npm (bundled with Node)
- Optional: ngrok for exposing MCP server to ChatGPT

## Installation
```bash
# Install shared/root packages (currently minimal)
npm install

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

## Environment
- Copy `client/.env.example` → `client/.env.local` and adjust the following values:
  - `VITE_AUTH_BASE_URL` — Better Auth server base (e.g., `https://auth.onemainarmy.com/api/auth` or local tunnel)
  - `VITE_MCP_METADATA_URL` — Central MCP discovery endpoint (e.g., `https://auth.onemainarmy.com/mcp`)
  - `VITE_TODO_API_BASE_URL` — Public URL where this todo API is hosted (e.g., `https://todo.onemainarmy.com` or `http://localhost:3000`)
  - Optional `VITE_CLIENT_BASE` to override Vite’s build base path when deploying under a subdirectory
  - Optional `VITE_ENABLE_AUTH_GATE` to temporarily disable the Better Auth gate (`false` reverts to unauthenticated flows)
- Copy `server/.env.example` → `server/.env` and configure:
  - `AUTH_BASE_URL` — Better Auth session endpoint (defaults to `https://auth.onemainarmy.com/api/auth`)
  - `AUTH_MCP_METADATA_URL` — MCP discovery metadata endpoint (defaults to `https://auth.onemainarmy.com/mcp`)
  - `TODO_API_BASE_URL` — Public origin serving this todo API (used for documentation/tests)
  - `TRUSTED_ORIGINS` — Comma-separated list of origins allowed by CORS (e.g., `http://localhost:3000,https://todo.onemainarmy.com`)
  - Optional `ENABLE_AUTH_GATE` to bypass server middleware during rollback (`false` disables session enforcement)
  - Optional `PORT` if you need the Express server to listen on a non-default port

## Build & Run
```bash
# Build the React SPA
cd client
npm run build

# Start the Express/MCP server (serves client/dist)
cd ../server
npm run dev  # or npm start for non-watch mode
```
- Server listens on `http://localhost:3000`.
- After building the client, Express serves the widget from `client/dist`.

## Testing
- No automated tests found (`*.test.*`, `__tests__` absent).
- Lint available via `client/npm run lint` (ESLint with React hooks configuration).

## MCP + ChatGPT Setup (from README)
1. Run the server locally (`npm run dev` in `server/`).
2. Expose port 3000 via ngrok: `ngrok http 3000`.
3. Configure ChatGPT → Apps & Connectors → MCP Server URL: `https://<ngrok-id>.ngrok-free.app/mcp`.
4. Interact using natural language or the embedded widget.

## Local Development Tips
- Rebuild the client after UI changes (`npm run build`) before testing via ChatGPT, or run Vite dev server separately for local preview.
- Consider adding environment variable support (e.g., Vite `VITE_API_BASE`, server `.env`) to avoid hard-coded URLs.
- Implement persistence and authentication before production deployment.
