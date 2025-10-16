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
- Storage is an in-memory array (`let tasks = []`); no persistence layer.
- CORS headers allow `*` origin and `GET, POST, OPTIONS` methods.
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
- No authentication; future Better Auth integration must secure all endpoints.
- POST endpoints expect JSON; ensure `Content-Type: application/json` is set by clients.
- Concurrency is not handled; simultaneous modifications could overwrite in-memory state.
