import express from 'express';
import cors from 'cors';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { requireSession } from './session.js';
import { fetchMcpMetadata } from './mcpMetadata.js';

const PORT = process.env.PORT || 3000;
const ENABLE_AUTH_GATE = (process.env.ENABLE_AUTH_GATE ?? 'true') !== 'false';
const AUTH_MCP_METADATA_URL = process.env.AUTH_MCP_METADATA_URL || 'https://auth.onemainarmy.com/mcp';
const TRUSTED_ORIGINS = (process.env.TRUSTED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowAllOrigins = TRUSTED_ORIGINS.length === 0;

const tasksByUser = new Map();
const legacyTasks = [];

const getTasksForUser = (userId) => {
  if (!tasksByUser.has(userId)) {
    tasksByUser.set(userId, []);
  }
  return tasksByUser.get(userId);
};

const logAuthState = (req, event, extra = {}) => {
  const authState = ENABLE_AUTH_GATE ? 'enforced' : 'bypassed';
  const payload = {
    route: req.path,
    method: req.method,
    authState,
    userId: ENABLE_AUTH_GATE ? req.userId ?? null : null,
    event,
    ...extra,
  };
  console.info('[better-auth]', payload);
};

const getTaskStore = (userId) => {
  if (!ENABLE_AUTH_GATE) {
    return legacyTasks;
  }
  return getTasksForUser(userId);
};

const createMcpServer = (taskStore) => {
  const server = new McpServer({
    name: 'Todo List',
    version: '1.0.0',
  });

  server.registerTool('createTask', {
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
      "openai/outputTemplate": "ui://widget/chatgpt-app-todo.html",
      "openai/toolInvocation/invoking": "Creating task...",
      "openai/toolInvocation/invoked": "Task created",
      "openai/widgetAccessible": true
    },
  }, ({ text }) => {
    const newTask = { id: Date.now(), text, completed: false };
    taskStore.push(newTask);
    return {
      structuredContent: newTask,
      content: [
        { type: 'text', text: newTask.text },
      ],
    }
  });

  server.registerTool('getTasks', {
    title: 'Get all tasks',
    description: 'Get all tasks',
    outputSchema: {
      tasks: z.array(z.object({
        id: z.number(),
        text: z.string(),
        completed: z.boolean(),
      })),
    },
    _meta: {
      "openai/outputTemplate": "ui://widget/chatgpt-app-todo.html",
      "openai/toolInvocation/invoking": "Getting tasks...",
      "openai/toolInvocation/invoked": "Tasks sent",
      "openai/widgetAccessible": true
    }
  }, () => {
    if (taskStore.length === 0) {
      return {
        structuredContent: { tasks: [] },
        content: [
          { type: 'text', text: 'No tasks found' },
        ],
      }
    }

    return {
      structuredContent: { tasks: taskStore },
      content: [
        { type: 'text', text: taskStore.map(t => t.text).join('\n') },
      ],
    }
  });

  server.registerTool('completeTask', {
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
      "openai/outputTemplate": "ui://widget/chatgpt-app-todo.html",
      "openai/toolInvocation/invoking": "Completing task...",
      "openai/toolInvocation/invoked": "Task completed",
      "openai/widgetAccessible": true
    },
  }, ({ id }) => {
    const task = taskStore.find(t => t.id === id);
    if (task) task.completed = true;
    return {
      structuredContent: task,
      content: [
        { type: 'text', text: task.text },
      ],
    }
  });

  const html = fs.readFileSync(path.join('../client/dist', 'index.html'), 'utf8').trim();
  server.registerResource(
    "chatgpt-app-todo-widget",
    "ui://widget/chatgpt-app-todo.html",
    {},
    () => ({
      contents: [{
        uri: "ui://widget/chatgpt-app-todo.html",
        mimeType: "text/html+skybridge",
        text: html
      }]
    })
  );

  return server;
};

const app = express();

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowAllOrigins || TRUSTED_ORIGINS.includes(origin)) {
        return callback(null, origin || true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  })
);

app.use(express.json());

app.use((err, req, res, next) => {
  if (err?.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'origin_not_allowed' });
  }
  return next(err);
});

const resolveTaskContext = (req, res) => {
  if (!ENABLE_AUTH_GATE) {
    return { userId: null, tasks: legacyTasks };
  }

  if (!req.userId) {
    res.status(403).json({ error: 'forbidden' });
    logAuthState(req, 'forbidden');
    return null;
  }

  return { userId: req.userId, tasks: getTasksForUser(req.userId) };
};

app.get('/mcp', async (req, res) => {
  try {
    const metadata = await fetchMcpMetadata(AUTH_MCP_METADATA_URL);
    logAuthState(req, 'fetch_mcp_metadata');
    res.json(metadata);
  } catch (error) {
    console.error('Failed to retrieve MCP metadata', error);
    res.status(502).json({ error: 'metadata_unavailable' });
  }
});

const registerRoute = (method, path, handler) => {
  if (ENABLE_AUTH_GATE) {
    app[method](path, requireSession, handler);
  } else {
    app[method](path, handler);
  }
};

registerRoute('get', '/tasks', (req, res) => {
  const context = resolveTaskContext(req, res);
  if (!context) return;
  logAuthState(req, 'list_tasks', { taskCount: context.tasks.length });
  res.json(context.tasks);
});

registerRoute('post', '/tasks', (req, res) => {
  const context = resolveTaskContext(req, res);
  if (!context) return;

  const text = (req.body?.text ?? '').toString().trim();
  if (!text) {
    return res.status(400).json({ error: 'Task text is required' });
  }

  const newTask = { id: Date.now(), text, completed: false };
  context.tasks.push(newTask);
  logAuthState(req, 'create_task', { taskId: newTask.id });
  res.json(newTask);
});

registerRoute('post', '/tasks/:id/complete', (req, res) => {
  const context = resolveTaskContext(req, res);
  if (!context) return;

  const task = context.tasks.find((item) => item.id === Number(req.params.id));
  if (task) {
    task.completed = true;
    logAuthState(req, 'complete_task', { taskId: task.id });
  }
  res.json(task ?? null);
});

const mcpHandlers = [];
if (ENABLE_AUTH_GATE) {
  mcpHandlers.push(requireSession);
}

mcpHandlers.push(async (req, res) => {
  const context = resolveTaskContext(req, res);
  if (!context) return;

  const server = createMcpServer(context.tasks);

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true
  });

  res.on('close', () => {
    transport.close();
  });

  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
  logAuthState(req, 'mcp_request');
});

app.post('/mcp', ...mcpHandlers);

app.use(express.static("../client/dist"));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
