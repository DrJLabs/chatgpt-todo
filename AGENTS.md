# Repository Guidelines

## Project Structure & Module Organization
The repository contains two Node projects. Root `package.json` wires shared metadata, while `.prettierrc` and `.editorconfig` enforce formatting. The MCP server lives in `server/index.js`, exposing Express routes, MCP tools, and serving static assets from the built client. The React widget is under `client/src/`, with `App.jsx` orchestrating the UI and `useOpenAiGlobal.js` synchronizing with ChatGPT. Run `npm run build` in `client/` to emit `client/dist/`, which the server serves via `ui://widget/chatgpt-app-todo.html`.

## Build, Test, and Development Commands
- `npm install` (root, `server/`, `client/`): install dependencies for each workspace.
- `npm run dev` in `client/`: start the Vite dev server for standalone UI testing.
- `npm run build` in `client/`: create the production widget bundle consumed by the server.
- `npm run dev` in `server/`: run the Express MCP server with `--watch` for local iteration.
- `npm run start` in `server/`: launch the server without watch mode for smoke checks.

No automated tests exist yet; use `npm run lint` in `client/` as the primary quality gate until test suites are added.

## Coding Style & Naming Conventions
Prettier (configured for two-space indentation, single quotes, and no semicolons) runs across the repo; align new files by invoking `npx prettier --write <path>`. Client code obeys ESLint (`npm run lint`), React Hooks rules, and Tailwind utility patterns. Prefer descriptive camelCase for variables and functions, PascalCase for components, and keep JSX focused by extracting helpers when handlers grow beyond a few lines. When touching the server, stay with modern ES modules and zod schema validation; add brief comments only around non-obvious MCP or transport logic.

## Testing Guidelines
No unit or integration tests ship today. When introducing features, add Jest or Vitest suites under `client/src/__tests__/` or server-side tests beside the module they exercise. Name test files `<Component>.test.jsx` or `<module>.test.js`. Until the suite exists, perform a manual regression: `npm run build` (client) and `npm run dev` (server) to confirm MCP calls succeed, and document the outcome in your pull request.

## Commit & Pull Request Guidelines
Create a fresh branch per change using `feat/<kebab-case>`, `fix/<kebab-case>`, or `chore/<kebab-case>`. Follow Conventional Commit subjects (`feat:`, `fix:`, etc.) capped at 72 characters and describe the scope briefly. Before opening a PR, ensure the client build succeeds, the server boots, and linting passes; include that evidence in the PR description. Reference related issues, summarize behavior changes, and add screenshots or terminal logs when the UI or MCP responses change. Resolve review threads only after addressing feedback or supplying clear follow-up plans.

## Security & Configuration Tips
Do not commit secrets or ngrok URLs; read them from environment variables or local config. Respect `.gitignore` and keep `.env` patterns aligned with `.env.example`. When sharing demos, rotate any temporary tokens and clean up diagnostic logging before merging.
