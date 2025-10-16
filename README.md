# ChatGPT Todo App with MCP

Learn how to build a ChatGPT app with this step-by-step tutorial! This todo list application demonstrates how to integrate with ChatGPT using the Model Context Protocol (MCP). You'll discover how to create MCP tools that ChatGPT can call, build a React widget that appears in ChatGPT's interface, and implement real-time synchronization between ChatGPT conversations and your app's UI.

For the detailed step-by-step tutorial, you can read it [here](https://codeaholicguy.com/2025/10/11/how-to-create-a-chatgpt-app-using-mcp-model-context-protocol-step-by-step).

## Architecture

### MCP Server

The server implements the Model Context Protocol to expose task management capabilities to ChatGPT:

- **MCP Tools**: Three tools are registered for ChatGPT to use:
  - `createTask`: Create a new todo task
  - `getTasks`: Retrieve all tasks
  - `completeTask`: Mark a task as completed

- **Widget Resource**: The server serves the React client as an embeddable widget (`ui://widget/chatgpt-app-todo.html`)

- **Tool Metadata**: Each tool includes OpenAI-specific metadata:
  - `openai/outputTemplate`: Points to the UI widget for rendering
  - `openai/widgetAccessible`: Makes the widget accessible from tool outputs
  - `openai/toolInvocation/*`: Custom loading and success messages

### Client with useOpenAiGlobal Hook

The React client uses the `useOpenAiGlobal` hook to integrate with ChatGPT's global state:

#### useOpenAiGlobal.js

This custom hook leverages React's `useSyncExternalStore` to:
- Subscribe to ChatGPT's global state changes via `openai:set_globals` events
- Access values from `window.openai` object
- Automatically re-render when ChatGPT updates tool outputs

**Key Features:**
```javascript
const toolOutput = useOpenAiGlobal("toolOutput");
```

- When ChatGPT invokes an MCP tool, the `toolOutput` value updates
- The client automatically fetches and refreshes the task list
- Provides real-time synchronization between ChatGPT actions and the UI

### How It Works

1. **Widget Rendering**: When ChatGPT calls an MCP tool, the client app is rendered as a widget
2. **State Synchronization**: The `useOpenAiGlobal` hook detects tool outputs and refreshes the UI
3. **Interactive UI**: Users can interact with the widget directly (add, complete tasks)
4. **Natural Language**: Users can also manage tasks through ChatGPT conversation

## Setup

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Install dependencies:

```bash
# Install root dependencies
npm install

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### Configure environment variables

Create a client env file based on the example and point it at the central Better Auth deployment (or your local tunnel when developing):

```bash
cp client/.env.example client/.env.local
# Update the values as needed
```

Key values:

- `VITE_AUTH_BASE_URL` – Better Auth base URL (e.g., `https://auth.onemainarmy.com/api/auth` or your local tunnel)
- `VITE_MCP_METADATA_URL` – MCP metadata hosted by the auth server
- `VITE_TODO_API_BASE_URL` – URL where this todo API is exposed (production host or `http://localhost:3000` in dev)
- Optional `VITE_CLIENT_BASE` – Override Vite’s build base path when deploying under a subdirectory
- Optional `VITE_ENABLE_AUTH_GATE` – Set to `false` to bypass the Better Auth gate during emergency rollback

For the server, copy the example and adjust trusted origins to match your deployment:

```bash
cp server/.env.example server/.env
# Update AUTH_BASE_URL, AUTH_MCP_METADATA_URL, TODO_API_BASE_URL, TRUSTED_ORIGINS as needed
```

Server-side flag:

- `ENABLE_AUTH_GATE` – Set to `false` to disable auth enforcement middleware while investigating issues (reverts to legacy unauthenticated behavior)

### Build the Client

Build the React client before starting the server:

```bash
cd client
npm run build
```

This creates the `client/dist` directory that the server will serve.

### Run the Server

Start the MCP server:

```bash
cd server
npm run dev
```

The server runs on `http://localhost:3000`.

## Connect App with ChatGPT

To use this app with ChatGPT, you'll need to expose your local server and connect it to ChatGPT.

### 1. Expose Local Server with ngrok

Since ChatGPT needs to access your local server, use ngrok to create a public URL:

```bash
# Install ngrok (if not already installed)
# Visit https://ngrok.com/ to download

# Start ngrok tunnel to your local server
ngrok http 3000
```

This will generate a public URL like: `https://xxxx-xx-xx-xx-xx.ngrok-free.app`

**Important**: Make sure your server is running on `http://localhost:3000` before starting ngrok.

### 2. Configure MCP in ChatGPT

1. Open ChatGPT (use the desktop or web app)
2. Go to **Settings → Apps & Connectors**
3. Click **Create**
4. Input your information and paste your ngrok URL with the `/mcp` endpoint to **MCP Server URL**:
   ```
   https://your-ngrok-url.ngrok-free.app/mcp
   ```
5. Save

### 3. Start Using Natural Language

Once connected, you can use natural language commands in ChatGPT:

- Type "@ChatGPT App Todo" for including your app. 
- "Create a new task: Buy groceries"
- "Show me all my tasks"
- "Complete task 1"
- "Mark the grocery shopping task as done"

### 4. Widget Interaction

When ChatGPT calls any task-related tool:
- The todo app widget appears in the ChatGPT interface
- The widget displays all tasks with a progress bar
- You can add tasks directly in the widget
- You can check off completed tasks by clicking checkboxes

### Troubleshooting

- **Connection fails**: Verify your server is running and ngrok tunnel is active
- **Widget not showing**: Make sure you ran `npm run build` in the client directory
- **Tasks not syncing**: Check browser console for CORS or network errors

## Development

### Project Structure

```
chatgpt-app-todo/
├── server/           # MCP server with Express
│   ├── index.js      # MCP server, tools, and REST API
│   └── package.json
├── client/           # React client app
│   ├── src/
│   │   ├── App.jsx           # Main UI component
│   │   ├── useOpenAiGlobal.js  # ChatGPT integration hook
│   │   └── main.jsx
│   └── package.json
└── README.md
```

### Technologies

**Server:**
- Express.js - Web server
- @modelcontextprotocol/sdk - MCP protocol implementation
- Zod - Schema validation

**Client:**
- React 19 - UI library
- Vite - Build tool
- Tailwind CSS - Styling
- Better Auth React Client - Authentication
- useSyncExternalStore - React hook for external state management

## Features

- ✅ Create tasks via ChatGPT or UI
- ✅ View all tasks with progress tracking
- ✅ Complete tasks with a click or voice command
- ✅ Real-time sync between ChatGPT and widget
- ✅ Beautiful, modern UI with Tailwind CSS
- ✅ Responsive design

## How useOpenAiGlobal Works

The `useOpenAiGlobal` hook creates a bridge between ChatGPT and your React app:

1. **External Store Pattern**: Uses React's `useSyncExternalStore` to manage state outside React
2. **Event Listening**: Listens for `openai:set_globals` custom events
3. **Global Access**: Reads values from `window.openai[key]`
4. **Automatic Updates**: Triggers re-renders when ChatGPT updates tool outputs

This pattern enables the widget to respond instantly when ChatGPT executes MCP tools, creating a seamless interactive experience.

## License

ISC
