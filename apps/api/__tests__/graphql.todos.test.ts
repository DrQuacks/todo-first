import request from 'supertest';
import type { Server } from 'node:http';
import { app, ready } from '../src/server';
import { resetDbForTests, closeDb } from '../src/db';

let server: Server;

beforeAll(async () => {
  await ready;            // ensure /graphql is mounted
  server = app.listen(0); // ephemeral port
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await closeDb();
});

beforeEach(async () => {
  await resetDbForTests();
});

describe('GraphQL /graphql', () => {
  it('creates, queries, updates, deletes a todo', async () => {
    // create
    const create = await request(server)
      .post('/graphql')
      .send({
        query: `
          mutation($title: String!) {
            createTodo(title: $title) { id title completed }
          }
        `,
        variables: { title: 'via GraphQL' },
      })
      .set('Content-Type', 'application/json');
    expect(create.status).toBe(200);
    const id = create.body.data.createTodo.id;

    // query
    const list = await request(server)
      .post('/graphql')
      .send({ query: `query { todos { id title completed } }` })
      .set('Content-Type', 'application/json');
    expect(list.status).toBe(200);
    expect(list.body.data.todos.some((t: any) => t.id === id)).toBe(true);

    // update
    const update = await request(server)
      .post('/graphql')
      .send({
        query: `
          mutation($id: Int!, $completed: Boolean) {
            updateTodo(id: $id, completed: $completed) { id title completed }
          }
        `,
        variables: { id, completed: true },
      })
      .set('Content-Type', 'application/json');
    expect(update.status).toBe(200);
    expect(update.body.data.updateTodo.completed).toBe(true);

    // delete
    const del = await request(server)
      .post('/graphql')
      .send({
        query: `mutation($id: Int!) { deleteTodo(id: $id) }`,
        variables: { id },
      })
      .set('Content-Type', 'application/json');
    expect(del.status).toBe(200);
    expect(del.body.data.deleteTodo).toBe(true);
  });
});
