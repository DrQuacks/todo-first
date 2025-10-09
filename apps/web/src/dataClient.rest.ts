import { API_BASE, type DataClient, type Todo, jfetch } from './dataClient';

export const restClient: DataClient = {
  listTodos: () => jfetch<Todo[]>(`${API_BASE}/todos`),
  createTodo: (title) => jfetch<Todo>(`${API_BASE}/todos`, { method: 'POST', body: { title } }),
  updateTodo: (id, patch) => jfetch<Todo>(`${API_BASE}/todos/${id}`, { method: 'PATCH', body: patch }),
  deleteTodo: async (id) => { await jfetch<void>(`${API_BASE}/todos/${id}`, { method: 'DELETE' }); },
};