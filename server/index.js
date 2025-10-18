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
import { fetchMcpMetadata } from './mcpMetadata.js';

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
const TRUSTED_ORIGINS = (process.env.TRUSTED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

if (TRUSTED_ORIGINS.length === 0) {
  console.error(
    'FATAL: TRUSTED_ORIGINS must be set to a comma-separated list when credentials are enabled.',
  );
  process.exit(1);
}

const clientDistDir = path.resolve(__dirname, '../client/dist');

const sharedTasks = [];
const tasksByUser = new Map();

const ensureTaskStore = (userId) => {
  if (!tasksByUser.has(userId)) {
    tasksByUser.set(userId, []);
  }
  return tasksByUser.get(userId);
};

const resolveTaskContext = (req) => {
  if (!ENABLE_AUTH_GATE) {
    return { userId: null, tasks: sharedTasks };
  }

  return {
    userId: req.userId,
    tasks: ensureTaskStore(req.userId),
  };
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
      outputSchema: z
        .object({
          id: z.number(),
          text: z.string(),
          completed: z.boolean(),
        })
        .nullable(),
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
      outputSchema: z
        .object({
          id: z.number(),
          text: z.string(),
          completed: z.boolean(),
        })
        .nullable(),
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
      outputSchema: z
        .object({
          id: z.number(),
          text: z.string(),
          completed: z.boolean(),
        })
        .nullable(),
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
        structuredContent: removed ?? null,
        content: [{ type: 'text', text: `Task ${id} deleted` }],
      };
    },
  );

  const html = fs.readFileSync(path.join(clientDistDir, 'index.html'), 'utf8').trim();
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
app.use((req, res, next) => {
  res.header('Vary', 'Origin');
  next();
});
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }
      if (TRUSTED_ORIGINS.includes(origin)) {
        return callback(null, origin);
      }
      return callback(new Error('origin_not_allowed'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

app.use((err, _req, res, next) => {
  if (err?.message === 'origin_not_allowed') {
    return res.status(403).json({ error: 'origin_not_allowed' });
  }
  return next(err);
});

app.use(express.json());

const guarded = (handler) => (ENABLE_AUTH_GATE ? [requireSession, handler] : [handler]);

app.get('/tasks', ...guarded((req, res) => {
  const { tasks } = resolveTaskContext(req);
  res.json(tasks);
}));

app.post('/tasks', ...guarded((req, res) => {
  const text = (req.body?.text ?? '').toString().trim();
  if (!text) {
    return res.status(400).json({ error: 'Task text is required' });
  }
  const { tasks } = resolveTaskContext(req);
  const newTask = { id: Date.now(), text, completed: false };
  tasks.push(newTask);
  res.json(newTask);
}));

app.post('/tasks/:id/complete', ...guarded((req, res) => {
  const { tasks } = resolveTaskContext(req);
  const task = tasks.find((item) => item.id === Number(req.params.id));
  if (task) {
    task.completed = true;
  }
  res.json(task ?? null);
}));

const fetchJson = async (url, timeoutMs = 10000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  let response;
  try {
    response = await fetch(url, { signal: controller.signal });
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('metadata_timeout');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    throw new Error(`metadata_unavailable:${response.status}`);
  }

  try {
    return await response.json();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`metadata_parse_error:${message}`);
  }
};

const loadProtectedResourceMetadata = async () => {
  const payload = await fetchMcpMetadata(AUTH_METADATA_URL);
  return shapeProtectedResourceMetadata(payload);
};

app.get('/mcp-metadata', async (_req, res) => {
  try {
    const metadata = await loadProtectedResourceMetadata();
    res.json(metadata);
  } catch (error) {
    const message = error instanceof Error ? error.message : error;
    console.error('Failed to read MCP metadata:', message);
    res.status(502).json({ error: 'metadata_unavailable' });
  }
});

app.get('/.well-known/oauth-protected-resource', async (_req, res) => {
  try {
    const metadata = await loadProtectedResourceMetadata();
    res.json(metadata);
  } catch (error) {
    const message = error instanceof Error ? error.message : error;
    console.error('Failed to expose protected resource metadata:', message);
    res.status(502).json({ error: 'metadata_unavailable' });
  }
});

app.get('/.well-known/oauth-authorization-server', async (_req, res) => {
  try {
    const metadata = await fetchJson(AUTH_DISCOVERY_URL);
    res.json(metadata);
  } catch (error) {
    const message = error instanceof Error ? error.message : error;
    console.error('Failed to expose discovery metadata:', message);
    res.status(502).json({ error: 'metadata_unavailable' });
  }
});

app.post('/mcp', ...guarded(async (req, res) => {
  const { tasks } = resolveTaskContext(req);
  const server = createMcpServer(tasks);

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

app.use(express.static(clientDistDir));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
