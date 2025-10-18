# Project Documentation Index

## Project Overview

- **Type:** Monolith
- **Primary Language:** TypeScript/JavaScript
- **Architecture:** React SPA + Express MCP server

## Quick Reference

- **Tech Stack:** React 19.1.1, Vite 7.1.7, Tailwind CSS 4.1, Express 5.1.0, MCP SDK 1.19.1
- **Entry Point:** `client/src/main.jsx` (SPA) • `server/index.js` (Express + MCP)
- **Architecture Pattern:** Single repository serving SPA assets and REST/MCP endpoints

## Generated Documentation

- [Project Overview](./project-overview.md)
- [Architecture](./architecture.md)
- [Source Tree Analysis](./source-tree-analysis.md)
- [Component Inventory](./component-inventory.md)
- [Development Guide](./development-guide.md)
- [Deployment Guide](./deployment-guide.md)
- [API Contracts](./api-contracts.md)
- [Data Models](./data-models.md)
- [State Management Patterns](./state-management-patterns-root.md)
- [Comprehensive Configuration Analysis](./comprehensive-analysis-root.md)

## Existing Documentation

- [README.md](../README.md) - Tutorial overview, architecture description, setup instructions, MCP/ngrok walkthrough
- [client/README.md](../client/README.md) - Client-specific setup and build guidance
- [docs/better-auth-integration-plan.md](./better-auth-integration-plan.md) - Planned Better Auth authentication and per-user storage integration steps
- [docs/bmm-workflow-status.md](./bmm-workflow-status.md) - BMAD workflow plan and progress tracking
- [docs/technical-decisions-template.md](./technical-decisions-template.md) - Template for recording technical decisions

## Getting Started

1. Install dependencies (`npm install` in root, `server/`, and `client/`).
2. Build the SPA: `cd client && npm run build`.
3. Start the server: `cd ../server && npm run dev` (serves REST + MCP endpoints at `http://localhost:3000`).
4. (Optional) Expose port 3000 via ngrok and configure the MCP server URL in ChatGPT to interact with the Todo app.
5. Manage tasks either through the React widget or by invoking MCP tools (`createTask`, `getTasks`, `completeTask`).

## Next Steps

- Add persistence (database/ORM) and authentication middleware per Better Auth plan.
- Replace hard-coded localhost/ngrok URLs with environment variables across client and server.
- Introduce automated testing and CI/CD pipeline before production deployment.
- Harden deployment (containerization, HTTPS) and document operational playbooks once infrastructure is defined.
