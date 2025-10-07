import express, { Request, Response } from 'express';
import cors from 'cors';
import { pool } from './db';
import { db } from './drizzle';
import { todos } from './schema';
import { desc } from 'drizzle-orm';

export const app = express();
app.use(cors());
app.use(express.json());

// Domain model (not required for typing req/res, just nice to have)
type Todo = { id: number; title: string; completed: boolean };

// let todos: Todo[] = [];
// let nextId = 1;

// Health
app.get('/health', (_req: Request, res: Response) => {
  res.json({ ok: true });
});

// GET /todos (Drizzle)
app.get('/todos', async (_req: Request, res: Response) => {
    const rows = await db
      .select({ id: todos.id, title: todos.title, completed: todos.completed })
      .from(todos)
      .orderBy(desc(todos.id));
    res.json(rows);
});

// POST /todos
app.post('/todos', async (req: Request, res: Response) => {
const title = String(req.body?.title ?? '').trim();
if (!title) return res.status(400).json({ error: 'title required' });

const { rows } = await pool.query(
    'INSERT INTO todos (title) VALUES ($1) RETURNING id, title, completed;',
    [title]
);
res.status(201).json(rows[0]);
});

// PATCH /todos/:id
app.patch('/todos/:id', async (req: Request, res: Response) => {
const id = Number(req.params.id);
if (!Number.isFinite(id)) return res.status(400).json({ error: 'invalid id' });

const fields: string[] = [];
const values: any[] = [];
let i = 1;
if (typeof req.body?.title === 'string') { fields.push(`title = $${i++}`); values.push(req.body.title); }
if (typeof req.body?.completed === 'boolean') { fields.push(`completed = $${i++}`); values.push(req.body.completed); }
if (!fields.length) return res.status(400).json({ error: 'no fields' });

values.push(id);
const { rows } = await pool.query(
    `UPDATE todos SET ${fields.join(', ')}, updated_at = NOW()
    WHERE id = $${i}
    RETURNING id, title, completed;`,
    values
);
if (!rows.length) return res.status(404).json({ error: 'not found' });
res.json(rows[0]);
});

// DELETE /todos/:id
app.delete('/todos/:id', async (req: Request, res: Response) => {
const id = Number(req.params.id);
if (!Number.isFinite(id)) return res.status(400).json({ error: 'invalid id' });
await pool.query('DELETE FROM todos WHERE id = $1;', [id]);
res.status(204).send();
});


if (require.main === module) {
    const port = process.env.PORT || 4000;
    app.listen(port, () => console.log(`API http://localhost:${port}`));
}
