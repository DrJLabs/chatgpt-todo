# Source Tree Analysis — chatgpt-todo-app

```
chatgpt-todo-app/
├── client/                     # React SPA packaged for MCP widget
│   ├── index.html              # Root HTML; Tailwind + React entry
│   ├── package.json            # Frontend dependencies (React 19, Vite 7, Tailwind)
│   ├── src/                    # Application source
│   │   ├── App.jsx             # Main UI component (task dashboard)
│   │   ├── main.jsx            # React entry point, renders <App />
│   │   ├── index.css           # Tailwind import (utility classes only)
│   │   ├── useOpenAiGlobal.js  # Custom hook subscribing to MCP globals
│   │   └── assets/             # Static assets (react.svg placeholder)
│   ├── vite.config.js          # Vite config; base URL set to ngrok endpoint
│   ├── tailwind.config.js      # Tailwind purge configuration
│   └── eslint.config.js        # ESLint setup with React hooks and refresh plugins
├── server/                     # Express server + MCP tools
│   ├── index.js                # Registers REST endpoints and MCP tools; serves client/dist
│   ├── package.json            # Server dependencies (Express, MCP SDK, Zod)
│   └── package-lock.json
├── docs/                       # Generated documentation & planning artifacts
│   ├── api-contracts-root.md   # REST/MCP endpoints catalog
│   ├── ui-component-inventory-root.md
│   ├── data-models-root.md
│   ├── state-management-patterns-root.md
│   ├── deployment-guide-root.md
│   ├── comprehensive-analysis-root.md
│   ├── better-auth-integration-plan.md  # Auth integration strategy (manual)
│   ├── bmm-workflow-status.md           # Workflow plan (BMAD)
│   └── project-scan-report.json         # Workflow state tracking
├── bmad/                       # BMAD workflow engine assets
├── README.md                   # High-level project intro
└── package.json                # Root metadata (workspaces not configured)
```

## Critical Folders
- `client/src/`: React SPA (hooks, components, Tailwind styling, MCP hook).
- `server/`: Express API + MCP tool registration and static file hosting.
- `docs/`: Latest documentation output plus existing plans (Better Auth, workflow status).

## Integration Paths
- After `npm run build` in `client/`, `server/index.js` reads `client/dist/index.html` to supply the MCP widget resource.
- REST endpoints (`/tasks`, `/tasks/:id/complete`) and MCP `/mcp` endpoint expose the same task operations consumed by the SPA and MCP clients.

## Observations
- No test directories detected (`__tests__`, `*.test.*` absent).
- No database/migrations directories; persistence remains in-memory within `server/index.js`.
- Configuration is minimal and local-focused; introduce environment variables before production deployment.
