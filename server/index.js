import express from 'express';
import cors from 'cors';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from 'zod';
import fs from 'fs';
import path, { join } from 'path';

const createMcpServer = () => {
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
      "openai/toolInvocation/invoked": "Task created"
    },
  }, async ({ text }) => {
    const newTask = { id: Date.now(), text, completed: false };
    tasks.push(newTask);
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
      // Optional status strings for nicer UX
      "openai/toolInvocation/invoking": "Getting tasks...",
      "openai/toolInvocation/invoked": "Tasks sent"
    }
  }, async () => {
    if (tasks.length === 0) {
      return {
        structuredContent: { tasks: [] },
        content: [
          { type: 'text', text: 'No tasks found' },
        ],
      }
    }

    return {
      structuredContent: { tasks },
      content: [
        { type: 'text', text: tasks.map(t => t.text).join('\n') },
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
      "openai/toolInvocation/invoked": "Task completed"
    },
  }, async ({ id }) => {
    const task = tasks.find(t => t.id === id);
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
    async () => ({
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
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

let tasks = [];

app.get('/tasks', (req, res) => res.json(tasks));
app.post('/tasks', (req, res) => {
  const newTask = { id: Date.now(), text: req.body.text, completed: false };
  tasks.push(newTask);
  res.json(newTask);
});

app.post('/tasks/:id/complete', (req, res) => {
  const task = tasks.find(t => t.id === +req.params.id);
  if (task) task.completed = true;
  res.json(task);
});

app.post('/mcp', async (req, res) => {
  const server = createMcpServer();

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true
  });

  res.on('close', () => {
    transport.close();
  });

  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

app.use(express.static("../client/dist"));

app.listen(3000, () => console.log('Server running on http://localhost:3000'));