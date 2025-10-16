# Project Overview — chatgpt-todo-app

## Purpose
A sample ChatGPT Todo application that demonstrates Model Context Protocol (MCP) integration. It exposes simple task management via both a React widget embedded in ChatGPT and REST/MCP endpoints served by an Express backend.

## Executive Summary
- Monolithic Node.js project combining SPA and API/MCP server.
- React 19 front-end built with Vite and Tailwind, rendered inside ChatGPT as a widget.
- Express 5 backend provides REST endpoints and MCP tools using `@modelcontextprotocol/sdk`.
- Current persistence is in-memory; Better Auth integration plan outlines future authentication and per-user storage.

## Technology Stack
| Layer | Technologies |
| --- | --- |
| Frontend | React 19.1.1, Vite 7.1.7, Tailwind CSS 4.1, custom `useOpenAiGlobal` hook |
| Backend | Express 5.1.0, `@modelcontextprotocol/sdk` 1.19.1, Zod 3.25.76 |
| Tooling | ESLint, ngrok, BMAD workflow assets |

## Architecture Classification
- **Type:** Monolith (single repository combining client + server)
- **Pattern:** SPA + API served from same Node process, MCP tools layered on backend
- **Data:** In-memory array (`tasks`) awaiting persistent store

## Repository Structure
- `client/` — React SPA, Tailwind styling, MCP widget integration
- `server/` — Express REST endpoints + MCP tools/resource registration
- `docs/` — Generated documentation outputs and existing plans (Better Auth, workflow status)
- `bmad/` — BMAD workflow execution engine assets

## Key Documentation
- `docs/architecture.md`
- `docs/api-contracts-root.md`
- `docs/ui-component-inventory-root.md`
- `docs/data-models-root.md`
- `docs/state-management-patterns-root.md`
- `docs/deployment-guide-root.md`
- `docs/source-tree-analysis.md`
- `docs/development-guide-root.md`
- `docs/better-auth-integration-plan.md`

## Current Limitations & Next Steps
1. Add persistent storage and authentication (Better Auth integration).
2. Introduce environment variables for API/auth URLs instead of hard-coded localhost/ngrok values.
3. Implement automated testing (unit/integration) and CI/CD pipeline.
4. Harden deployment (containerization or managed hosting) and enforce HTTPS.
