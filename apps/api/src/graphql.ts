import { gql } from 'graphql-tag';
import { db } from './drizzle';
import { todos } from './schema';
import { desc, eq } from 'drizzle-orm';

export const typeDefs = gql`
  type Todo {
    id: Int!
    title: String!
    completed: Boolean!
  }

  type Query {
    todos: [Todo!]!
    todo(id: Int!): Todo
  }

  type Mutation {
    createTodo(title: String!): Todo!
    updateTodo(id: Int!, title: String, completed: Boolean): Todo!
    deleteTodo(id: Int!): Boolean!  # true if delete attempted; mirrors your 204 (no body)
  }
`;

export const resolvers = {
  Query: {
    todos: async () => {
      return db
        .select({ id: todos.id, title: todos.title, completed: todos.completed })
        .from(todos)
        .orderBy(desc(todos.id));
    },
    todo: async (_: unknown, args: { id: number }) => {
      const rows = await db
        .select({ id: todos.id, title: todos.title, completed: todos.completed })
        .from(todos)
        .where(eq(todos.id, args.id));
      return rows[0] ?? null;
    },
  },
  Mutation: {
    createTodo: async (_: unknown, args: { title: string }) => {
      const title = String(args.title ?? '').trim();
      if (!title) throw new Error('title required');
      const rows = await db
        .insert(todos)
        .values({ title })
        .returning({ id: todos.id, title: todos.title, completed: todos.completed });
      return rows[0];
    },
    updateTodo: async (_: unknown, args: { id: number; title?: string; completed?: boolean }) => {
      const { id, title, completed } = args;
      if (!Number.isFinite(id)) throw new Error('invalid id');
      const patch: Record<string, unknown> = {};
      if (typeof title === 'string') patch.title = title;
      if (typeof completed === 'boolean') patch.completed = completed;
      if (!Object.keys(patch).length) throw new Error('no fields');

      const rows = await db
        .update(todos)
        .set({ ...patch, updatedAt: new Date() })
        .where(eq(todos.id, id))
        .returning({ id: todos.id, title: todos.title, completed: todos.completed });

      if (rows.length === 0) throw new Error('not found');
      return rows[0];
    },
    deleteTodo: async (_: unknown, args: { id: number }) => {
      const { id } = args;
      if (!Number.isFinite(id)) throw new Error('invalid id');
      await db.delete(todos).where(eq(todos.id, id));
      return true;
    },
  },
};
