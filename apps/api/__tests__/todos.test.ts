import request from 'supertest';
import { app, _resetForTests } from '../src/server';

beforeEach(() => _resetForTests());

describe('Todos API', () => {
  it('health returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('CRUD: create -> list -> update -> delete', async () => {
    // create
    const created = await request(app)
      .post('/todos')
      .send({ title: 'learn supertest' })
      .set('Content-Type', 'application/json');
    expect(created.status).toBe(201);
    const id = created.body.id;

    // list
    const list = await request(app).get('/todos');
    expect(list.status).toBe(200);
    expect(list.body.some((t: any) => t.id === id)).toBe(true);

    // update
    const updated = await request(app)
      .patch(`/todos/${id}`)
      .send({ completed: true })
      .set('Content-Type', 'application/json');
    expect(updated.status).toBe(200);
    expect(updated.body.completed).toBe(true);

    // delete
    const del = await request(app).delete(`/todos/${id}`);
    expect(del.status).toBe(204);

    // confirm deletion
    const list2 = await request(app).get('/todos');
    expect(list2.body.some((t: any) => t.id === id)).toBe(false);
  });

  it('400 when title is empty', async () => {
    const res = await request(app)
      .post('/todos')
      .send({ title: '' })
      .set('Content-Type', 'application/json');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('title required');
  });
});
