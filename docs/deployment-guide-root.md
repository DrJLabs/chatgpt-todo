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
- `client/vite.config.js` sets the `base` URL to `https://lignitic-sustentative-kasi.ngrok-free.dev` (ngrok staging endpoint).
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
- No `.env` file committed; endpoints are hard-coded to `http://localhost:3000` in the client.
- Better Auth integration plan indicates future environment variables (e.g., `AUTH_BASE_URL`, `TODO_API_BASE_URL`).
- Deployment will require exposing MCP `/mcp` endpoint and aligning with Better Auth production URLs.

## Current Limitations
- Data is in-memory; restarting the server loses all tasks.
- No CI/CD or containerization described; deployment must be scripted manually.
- No HTTPS/TLS configuration in code; reverse proxy or hosting platform must handle it.

## Recommended Next Steps
1. Introduce environment variable support (Vite `VITE_…` and server `.env`) for API bases and auth endpoints.
2. Package the application (Docker or PM2) for predictable deployment.
3. Implement persistence (database) before production launch; update server to externalize task storage.
4. Configure Better Auth credentials and update fetch calls to use relative paths once auth proxying is in place.
5. Set up CI (GitHub Actions) to run lint/build and produce artifacts for deployment.
