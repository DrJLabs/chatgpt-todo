# UI Component Inventory — chatgpt-todo-app

## Framework & Styling
- **Frontend framework:** React ^19.1.1 (resolves to latest 19.1.x via npm)
- **Styling:** Tailwind CSS 4.1 (utility classes imported via `client/src/index.css`)
- **Build:** Vite 7.1.7 with `@tailwindcss/vite` plugin

## Components
| Component | File | Category | Responsibilities | Key Notes |
| --- | --- | --- | --- | --- |
| `App` | `client/src/App.jsx` | Page / Shell | Renders task dashboard with header, progress bar, input form, and list of tasks. Manages local state and API calls. | Uses `useState`/`useEffect`; references MCP widget globals through `useOpenAiGlobal`; wraps content in `AuthGate` and calls `apiFetch` (env-driven base, `credentials: 'include'`). |
| `AuthGate` | `client/src/components/AuthGate.jsx` | Wrapper | Blocks rendering until `useSession` resolves; shows loading/error states and the sign-in call-to-action. | Uses Better Auth hooks (`useSession`, `signIn`, `signOut`) and renders children only when authenticated. |
| `SignInWithGoogle` | `client/src/components/SignInWithGoogle.jsx` | Button | Launches Better Auth Google OAuth flow. | Simple anchor button pointing at the Better Auth social sign-in endpoint. |
| `useOpenAiGlobal` | `client/src/useOpenAiGlobal.js` | Custom Hook | Subscribes to MCP `openai:set_globals` events so the SPA responds to tool output changes inside ChatGPT. | Wraps `useSyncExternalStore`; adds/removes event listeners on `window`; returns current global value. |

## UI Patterns & Styling Highlights
- Pure Tailwind utility classes for layout (`flex`, `gap-2`, `max-w-2xl`, etc.), typography (`text-3xl`, `text-gray-600`), and buttons (`bg-blue-600`, `hover:bg-blue-700`).
- Progress bar implemented with dynamic width style based on completed/total tasks.
- Form input listens for Enter key to create tasks quickly.

## Assets
| Asset | Location | Usage |
| --- | --- | --- |
| `react.svg` | `client/src/assets/react.svg` | Tailwind/React placeholder logo (not currently rendered). |

## Interaction with MCP Widget
- The `App` component conditionally calls `useOpenAiGlobal` if `window.openai` is present, ensuring the UI refreshes whenever the MCP tool output changes.

## Testing Status
- No component/unit tests present (`*.test.*` or `__tests__` folders not found).
