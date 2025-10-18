# API Contracts — chatgpt-todo-app

## Overview
The Express server in `server/index.js` exposes a minimal task management API consumed by the SPA and Model Context Protocol (MCP) tools. All endpoints respond with JSON and expect requests over HTTP on port `3000`.

## REST Endpoints
| Method | Path | Description | Request Body | Response Shape |
| --- | --- | --- | --- | --- |
| GET | `/tasks` | Returns all tasks in memory. | n/a | `[{ id: number, text: string, completed: boolean }]` |
| POST | `/tasks` | Creates a new task and appends it to the in-memory list. | `{ "text": string }` | `{ id: number, text: string, completed: false }` |
| POST | `/tasks/:id/complete` | Marks the specified task as completed (if found). | n/a | `{ id: number, text: string, completed: true } \| null if not found` |

### Notes
- When `ENABLE_AUTH_GATE=true`, tasks are stored in per-user in-memory arrays keyed by the Better Auth user id; disabling the flag falls back to the legacy shared array for emergency rollback.
- CORS responses echo only trusted origins from `TRUSTED_ORIGINS` and include `Access-Control-Allow-Credentials: true` so session cookies flow between the todo server and Better Auth.
- Failures for unknown task IDs return `null` (no explicit 404 handling).

## MCP Endpoint
| Method | Path | Description |
| --- | --- | --- |
| POST | `/mcp` | Handles Model Context Protocol requests via `@modelcontextprotocol/sdk` (`McpServer`). Routes are established dynamically per request.

### Registered MCP Tools
| Tool | Purpose | Input Schema | Output Schema |
| --- | --- | --- | --- |
| `createTask` | Create a task via MCP interaction. | `{ text: string }` | `{ id: number, text: string, completed: boolean }` |
| `getTasks` | Retrieve all tasks for UI widgets. | n/a | `{ tasks: Array<{ id, text, completed }> }` |
| `completeTask` | Mark a task as complete. | `{ id: number }` | `{ id: number, text: string, completed: boolean }` |

### MCP Widgets
- Registers `chatgpt-app-todo-widget` providing the compiled SPA via `ui://widget/chatgpt-app-todo.html` (loaded from `client/dist/index.html`).

## Integration Considerations
- Authentication is enforced via Better Auth session middleware (`requireSession` in `server/session.js`) whenever `ENABLE_AUTH_GATE` is left at its default `true` value.
- POST endpoints expect JSON; ensure `Content-Type: application/json` is set by clients.
- Concurrency is not handled; simultaneous modifications could overwrite in-memory state.
