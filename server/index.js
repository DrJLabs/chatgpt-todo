import express from 'express';
import cors from 'cors';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config as loadEnv } from 'dotenv';
import { requireSession } from './session.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.resolve(__dirname, '..', '.env') });

const PORT = process.env.PORT || 3000;
const ENABLE_AUTH_GATE = (process.env.ENABLE_AUTH_GATE ?? 'true') !== 'false';
const AUTH_METADATA_URL =
  process.env.AUTH_METADATA_URL ||
  'https://auth.onemainarmy.com/.well-known/oauth-protected-resource';
const AUTH_DISCOVERY_URL =
  process.env.AUTH_DISCOVERY_URL ||
  'https://auth.onemainarmy.com/.well-known/oauth-authorization-server';
const TODO_PUBLIC_BASE_URL =
  process.env.TODO_PUBLIC_BASE_URL || 'https://todo.onemainarmy.com';

const sharedTasks = [];
const tasksByUser = new Map();

const ensureTaskStore = (userId) => {
  if (!tasksByUser.has(userId)) {
    tasksByUser.set(userId, []);
  }
  return tasksByUser.get(userId);
};

const resolveTasks = (req) => {
  if (!ENABLE_AUTH_GATE) {
    return sharedTasks;
  }
  return ensureTaskStore(req.userId);
};

const shapeProtectedResourceMetadata = (metadata) => {
  return {
    ...metadata,
    resource: TODO_PUBLIC_BASE_URL,
  };
};

const createMcpServer = (taskStore) => {
  const server = new McpServer({
    name: 'Todo List',
    version: '1.0.0',
  });

  server.registerTool(
    'createTask',
    {
      title: 'Create a new task',
      description: 'Create a new task',
      inputSchema: {
        text: z.string(),
      },
      outputSchema: {
        id: z.number(),
        text: z.string(),
        completed: z.boolean(),
      },
      _meta: {
        'openai/outputTemplate': 'ui://widget/chatgpt-app-todo.html',
        'openai/toolInvocation/invoking': 'Creating task...',
        'openai/toolInvocation/invoked': 'Task created',
        'openai/widgetAccessible': true,
      },
    },
    ({ text }) => {
      const newTask = { id: Date.now(), text, completed: false };
      taskStore.push(newTask);
      return {
        structuredContent: newTask,
        content: [{ type: 'text', text: newTask.text }],
      };
    },
  );

  server.registerTool(
    'getTasks',
    {
      title: 'Get all tasks',
      description: 'Get all tasks',
      outputSchema: {
        tasks: z.array(
          z.object({
            id: z.number(),
            text: z.string(),
            completed: z.boolean(),
          }),
        ),
      },
      _meta: {
        'openai/outputTemplate': 'ui://widget/chatgpt-app-todo.html',
        'openai/toolInvocation/invoking': 'Getting tasks...',
        'openai/toolInvocation/invoked': 'Tasks sent',
        'openai/widgetAccessible': true,
      },
    },
    () => {
      return {
        structuredContent: { tasks: taskStore },
        content: [{ type: 'text', text: taskStore.map((t) => t.text).join('\n') }],
      };
    },
  );

  server.registerTool(
    'completeTask',
    {
      title: 'Complete a task',
      description: 'Complete a task',
      inputSchema: {
        id: z.number(),
      },
      outputSchema: {
        id: z.number(),
        text: z.string(),
        completed: z.boolean(),
      },
      _meta: {
        'openai/outputTemplate': 'ui://widget/chatgpt-app-todo.html',
        'openai/toolInvocation/invoking': 'Completing task...',
        'openai/toolInvocation/invoked': 'Task completed',
        'openai/widgetAccessible': true,
      },
    },
    ({ id }) => {
      const task = taskStore.find((t) => t.id === id);
      if (task) {
        task.completed = true;
      }
      return {
        structuredContent: task ?? null,
        content: [{ type: 'text', text: task ? task.text : `Task ${id} not found` }],
      };
    },
  );

  server.registerTool(
    'deleteTask',
    {
      title: 'Delete a task',
      description: 'Delete a task',
      inputSchema: {
        id: z.number(),
      },
      outputSchema: {
        id: z.number(),
        text: z.string(),
        completed: z.boolean(),
      },
      _meta: {
        'openai/outputTemplate': 'ui://widget/chatgpt-app-todo.html',
        'openai/toolInvocation/invoking': 'Deleting task...',
        'openai/toolInvocation/invoked': 'Task deleted',
        'openai/widgetAccessible': true,
      },
    },
    ({ id }) => {
      const index = taskStore.findIndex((t) => t.id === id);
      if (index === -1) {
        return {
          structuredContent: null,
          content: [{ type: 'text', text: `Task ${id} not found` }],
        };
      }
      const [removed] = taskStore.splice(index, 1);
      return {
        structuredContent: removed,
        content: [{ type: 'text', text: `Task ${id} deleted` }],
      };
    },
  );

  const html = fs.readFileSync(path.join('../client/dist', 'index.html'), 'utf8').trim();
  server.registerResource(
    'chatgpt-app-todo-widget',
    'ui://widget/chatgpt-app-todo.html',
    {},
    () => ({
      contents: [
        {
          uri: 'ui://widget/chatgpt-app-todo.html',
          mimeType: 'text/html+skybridge',
          text: html,
        },
      ],
    }),
  );

  return server;
};

const app = express();
app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);
app.use(express.json());

const guarded = (handler) =>
  ENABLE_AUTH_GATE ? [requireSession, handler] : [handler];

app.get('/tasks', ...guarded((req, res) => {
  res.json(resolveTasks(req));
}));

app.post('/tasks', ...guarded((req, res) => {
  const text = (req.body?.text ?? '').toString().trim();
  if (!text) {
    return res.status(400).json({ error: 'Task text is required' });
  }
  const taskStore = resolveTasks(req);
  const newTask = { id: Date.now(), text, completed: false };
  taskStore.push(newTask);
  res.json(newTask);
}));

app.post('/tasks/:id/complete', ...guarded((req, res) => {
  const taskStore = resolveTasks(req);
  const task = taskStore.find((item) => item.id === Number(req.params.id));
  if (task) {
    task.completed = true;
  }
  res.json(task ?? null);
}));

const fetchJson = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('metadata_unavailable');
  }
  return response.json();
};

const loadProtectedResourceMetadata = async () => {
  const payload = await fetchJson(AUTH_METADATA_URL);
  return shapeProtectedResourceMetadata(payload);
};

app.get('/mcp-metadata', async (_req, res) => {
  try {
    const metadata = await loadProtectedResourceMetadata();
    res.json(metadata);
  } catch (error) {
    console.error('Failed to read MCP metadata', error);
    res.status(502).json({ error: 'metadata_unavailable' });
  }
});

app.get('/.well-known/oauth-protected-resource', async (_req, res) => {
  try {
    const metadata = await loadProtectedResourceMetadata();
    res.json(metadata);
  } catch (error) {
    console.error('Failed to expose protected resource metadata', error);
    res.status(502).json({ error: 'metadata_unavailable' });
  }
});

app.get('/.well-known/oauth-authorization-server', async (_req, res) => {
  try {
    const metadata = await fetchJson(AUTH_DISCOVERY_URL);
    res.json(metadata);
  } catch (error) {
    console.error('Failed to expose discovery metadata', error);
    res.status(502).json({ error: 'metadata_unavailable' });
  }
});

app.post('/mcp', ...guarded(async (req, res) => {
  const taskStore = resolveTasks(req);
  const server = createMcpServer(taskStore);

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  res.on('close', () => {
    transport.close();
  });

  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
}));

app.use(express.static('../client/dist'));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
