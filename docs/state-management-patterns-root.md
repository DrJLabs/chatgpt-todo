# State Management Patterns — chatgpt-todo-app

## Client-Side State
- Uses React’s built-in hooks (`useState`, `useEffect`) within `client/src/App.jsx` to track task list and form text.
- No shared context, Redux store, or external state manager. Logic remains inside the App component.
- Integrates with the MCP widget by subscribing to `window.openai` globals via the custom hook `useOpenAiGlobal` (wraps `useSyncExternalStore`).
- All writes (add/complete) trigger a refetch from the Express API; no optimistic caching layer.

## Server-Side State
- Tasks are kept in in-memory stores within `server/index.js`: per-user arrays when `ENABLE_AUTH_GATE=true`, or a legacy shared array when the flag is disabled for rollback.
- All REST/MCP endpoints mutate those arrays directly; persistence is still pending, so data is lost on restart.
- A future data layer should externalize storage while keeping the Better Auth feature flag as an emergency bypass.

## Recommendations
1. Introduce client-side state segregation (e.g., custom hooks or context) once the UI grows beyond a single page.
2. Add persistence + per-user filtering so the server state aligns with authenticated sessions.
3. Consider invalidation patterns or SWR-like caching for smoother UX once persistence is added.
