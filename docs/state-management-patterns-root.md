# State Management Patterns — chatgpt-todo-app

## Client-Side State
- Uses React’s built-in hooks (`useState`, `useEffect`) within `client/src/App.jsx` to track task list and form text.
- No shared context, Redux store, or external state manager. Logic remains inside the App component.
- Integrates with the MCP widget by subscribing to `window.openai` globals via the custom hook `useOpenAiGlobal` (wraps `useSyncExternalStore`).
- All writes (add/complete) trigger a refetch from the Express API; no optimistic caching layer.

## Server-Side State
- Tasks are kept in an in-memory array (`let tasks = []`) in `server/index.js`.
- All REST/MCP endpoints mutate the array directly; there is no session or per-user state yet.
- Planned Better Auth integration will introduce per-user storage, requiring a data layer refactor.

## Recommendations
1. Introduce client-side state segregation (e.g., custom hooks or context) once the UI grows beyond a single page.
2. Add persistence + per-user filtering so the server state aligns with authenticated sessions.
3. Consider invalidation patterns or SWR-like caching for smoother UX once persistence is added.
