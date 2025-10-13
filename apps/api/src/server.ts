import express, { Request, Response } from 'express';
import cors from 'cors';
import { db } from './drizzle';
import { todos } from './schema';
import { eq , desc } from 'drizzle-orm';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express5';
import bodyParser from 'body-parser';
import { typeDefs, resolvers } from './graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { createHandler as createHttpHandler } from 'graphql-http/lib/use/express';
import { TodoCreateSchema, TodoUpdateSchema } from './validation';
import type { NextFunction } from 'express';
import type { ZodIssue } from 'zod';

function validateBody(schema: { safeParse: (x: unknown) => any }) {
    return (req: Request, res: Response, next: NextFunction) => {
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'validation_error',
          issues: parsed.error.issues.map((i: ZodIssue) => ({
            path: i.path.join('.'),
            message: i.message,
            code: i.code,
          })),
        });
      }
      (req as any).validated = parsed.data;
      next();
    };
  }

export const app = express();
app.use(cors());
app.use(express.json());


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
app.post('/todos', validateBody(TodoCreateSchema), async (req: Request, res: Response) => {
    const { title } = (req as any).validated as { title: string };

    const rows = await db
        .insert(todos)
        .values({ title }) // completed defaults to false via schema
        .returning({ id: todos.id, title: todos.title, completed: todos.completed });

    res.status(201).json(rows[0]);
});

// PATCH /todos/:id
app.patch('/todos/:id', validateBody(TodoUpdateSchema), async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'invalid id' });

    const patch = (req as any).validated as { title?: string; completed?: boolean };
  
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

export const ready = (async function bootstrap() {
  // 1) Apollo (move it to /graphql-apollo so we can free /graphql for the new engine)
  const apollo = new ApolloServer({ typeDefs, resolvers });
  await apollo.start();
  app.use('/graphql-apollo', bodyParser.json(), expressMiddleware(apollo));

  // 2) graphql-http (spec-compliant, lightweight) at /graphql
  const schema = makeExecutableSchema({ typeDefs, resolvers });
  app.all('/graphql', createHttpHandler({ schema }));
  
    if (require.main === module) {
      const port = process.env.PORT || 4000;
      app.listen(port, () => {
        console.log(`REST        http://localhost:${port}/todos`);
        console.log(`GraphQL     http://localhost:${port}/graphql        (graphql-http)`);
        console.log(`GraphQL     http://localhost:${port}/graphql-apollo (Apollo)`);
      });
    }
  })();
