import express, { Request, Response } from 'express';
import cors from 'cors';
import { pool } from './db';
import { db } from './drizzle';
import { todos } from './schema';
import { eq , desc } from 'drizzle-orm';

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

    const rows = await db
        .insert(todos)
        .values({ title }) // completed defaults to false via schema
        .returning({ id: todos.id, title: todos.title, completed: todos.completed });

    res.status(201).json(rows[0]);
});

// PATCH /todos/:id
app.patch('/todos/:id', async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'invalid id' });

    const patch: Partial<{ title: string; completed: boolean }> = {};
    if (typeof req.body?.title === 'string') patch.title = req.body.title;
    if (typeof req.body?.completed === 'boolean') patch.completed = req.body.completed;
  
    if (!Object.keys(patch).length) {
      return res.status(400).json({ error: 'no fields' });
    }
  
    const rows = await db
      .update(todos)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(todos.id, id))
      .returning({ id: todos.id, title: todos.title, completed: todos.completed });

    if (!rows.length) return res.status(404).json({ error: 'not found' });
    res.json(rows[0]);
});

// DELETE /todos/:id
app.delete('/todos/:id', async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'invalid id' });
    await db.delete(todos).where(eq(todos.id, id));
    res.status(204).send();
});


if (require.main === module) {
    const port = process.env.PORT || 4000;
    app.listen(port, () => console.log(`API http://localhost:${port}`));
}
