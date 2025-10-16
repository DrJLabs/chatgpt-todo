# Data Models — chatgpt-todo-app

The current implementation stores tasks in-memory inside `server/index.js`:

```js
let tasks = [];
```

No database or ORM is configured yet. Every REST/MCP call mutates this in-memory array, so data is lost on server restart.

## Planned Extensions
- Introduce a persistence layer (SQLite/Postgres) before production use.
- Align with Better Auth user identities so tasks can be stored per-user.
- Replace `let tasks = []` with a repository abstraction when storage is added.
