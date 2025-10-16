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
- No `.env` files committed yet; client fetches `http://localhost:3000` directly.
- Better Auth plan introduces `AUTH_BASE_URL`, `TODO_API_BASE_URL`, etc. (not wired in code yet).

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
