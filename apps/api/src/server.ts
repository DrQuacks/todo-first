import express, { Request, Response } from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// Domain model (not required for typing req/res, just nice to have)
type Todo = { id: number; title: string; completed: boolean };

let todos: Todo[] = [];
let nextId = 1;

// Health
app.get('/health', (_req: Request, res: Response) => {
  res.json({ ok: true });
});

// List
app.get('/todos', (_req: Request, res: Response) => {
  res.json(todos);
});

// Create (req.body is still any in this option)
app.post('/todos', (req: Request, res: Response) => {
  const title = String(req.body?.title ?? '').trim();
  if (!title) return res.status(400).json({ error: 'title required' });

  const todo: Todo = { id: nextId++, title, completed: false };
  todos.unshift(todo);
  res.status(201).json(todo);
});

// Update
app.patch('/todos/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'invalid id' });

  const t = todos.find(x => x.id === id);
  if (!t) return res.status(404).json({ error: 'not found' });

  if (typeof req.body?.title === 'string') t.title = req.body.title;
  if (typeof req.body?.completed === 'boolean') t.completed = req.body.completed;

  res.json(t);
});

// Delete
app.delete('/todos/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'invalid id' });

  todos = todos.filter(x => x.id !== id);
  res.status(204).send();
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`API http://localhost:${port}`));
