import { type DataClient, type Todo, jfetch } from './dataClient';

export const restClient: DataClient = {
  listTodos: () => jfetch<Todo[]>(`/todos`),
  createTodo: (title) => jfetch<Todo>(`/todos`, { method: 'POST', body: { title } }),
  updateTodo: (id, patch) => jfetch<Todo>(`/todos/${id}`, { method: 'PATCH', body: patch }),
  deleteTodo: async (id) => { await jfetch<void>(`/todos/${id}`, { method: 'DELETE' }); },
};