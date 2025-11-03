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
import { TodoCreateSchema, TodoUpdateSchema, IdParamSchema, TodosQuerySchema } from './validation';
import type { NextFunction } from 'express';
import type { ZodIssue } from 'zod';
import helmet from "helmet";
import rateLimit from "express-rate-limit";


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

function validateParams(schema: any) {
    return (req: Request, res: Response, next: NextFunction) => {
      const parsed = schema.safeParse(req.params);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'validation_error',
          issues: parsed.error.issues,
        });
      }
      (req as any).paramsValidated = parsed.data;
      next();
    };
}

function validateQuery(schema: { safeParse: (x: unknown) => any }) {
    return (req: Request, res: Response, next: NextFunction) => {
      const parsed = schema.safeParse(req.query);
      if (!parsed.success) {
        return res.status(400).json({
          error: "validation_error",
          issues: parsed.error.issues.map((i: ZodIssue) => ({
            path: i.path.join("."),
            message: i.message,
            code: i.code,
          })),
        });
      }
      (req as any).queryValidated = parsed.data; // typed, coerced values
      next();
    };
}

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,   // 15 minutes
    max: 100,                   // limit each IP to 100 requests per window
    standardHeaders: true,      // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false,       // Disable `X-RateLimit-*` headers
  });

export const app = express();
app.use(cors({
    origin: process.env.WEB_ORIGIN || "http://localhost:5173",
    methods: ["GET","POST","PATCH","DELETE","OPTIONS"],
    allowedHeaders: ["Content-Type","Authorization"],
    credentials: true,  // if you allow cookies/auth headers
  }));
app.use(express.json());
app.use(helmet());
app.use(limiter);

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
app.patch('/todos/:id', validateParams(IdParamSchema), validateBody(TodoUpdateSchema), async (req: Request, res: Response) => {
    const { id } = (req as any).paramsValidated;
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

// GET /external/prices?ids=bitcoin,ethereum,solana
app.get('/external/prices', async (req, res) => {
    const ids = String(req.query.ids || '').toLowerCase().trim();
    if (!ids) return res.status(400).json({ error: 'ids required' });
  
    // helper: fetch with timeout
    const fetchWithTimeout = async (url: string, ms = 3500) => {
      const ac = new AbortController();
      const t = setTimeout(() => ac.abort(), ms);
      try {
        const r = await fetch(url, { signal: ac.signal as any });
        return r;
      } finally {
        clearTimeout(t);
      }
    };
  
    // 1) Try CoinCap (native JSON shape we already handle)
    const coincapUrl = `https://api.coincap.io/v2/assets?ids=${encodeURIComponent(ids)}`;
    try {
      const r = await fetchWithTimeout(coincapUrl, 4000);
      if (r.ok) {
        const json = await r.json();
        return res.json(json); // { data: [{ id, priceUsd, ... }] }
      } else {
        console.warn('[external/prices] CoinCap non-OK:', r.status);
      }
    } catch (e) {
      console.warn('[external/prices] CoinCap fetch error:', (e as Error).message);
    }
  
    // 2) Fallback to CoinGecko and map to CoinCap-like shape
    try {
      const cgUrl =
        `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(ids)}&vs_currencies=usd`;
      const r2 = await fetchWithTimeout(cgUrl, 4000);
      if (!r2.ok) {
        console.warn('[external/prices] CoinGecko non-OK:', r2.status);
        return res.status(502).json({ error: 'upstream failed' });
      }
      const j = await r2.json() as Record<string, { usd?: number }>;
      const data = Object.entries(j).map(([id, obj]) => ({
        id,
        priceUsd: obj.usd != null ? String(obj.usd) : undefined,
      }));
      return res.json({ data });
    } catch (e) {
      console.warn('[external/prices] CoinGecko fetch error:', (e as Error).message);
      return res.status(502).json({ error: 'upstream fetch failed' });
    }
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
