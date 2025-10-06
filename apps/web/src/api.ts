// apps/web/src/api.ts
export type Todo = { id: number; title: string; completed: boolean };

// Use env var if present, else fall back to localhost
const API_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
  'http://localhost:4000';

type RequestOptions = Omit<RequestInit, 'body'> & { body?: unknown };

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(opts.headers || {}),
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  // Attempt to parse JSON either way
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const message = (data && (data.error || data.message)) || `HTTP ${res.status}`;
    throw new Error(message);
  }
  return data as T;
}

// API functions
export const listTodos = () => request<Todo[]>('/todos');
export const createTodo = (title: string) => request<Todo>('/todos', { method: 'POST', body: { title } });
export const updateTodo = (id: number, patch: Partial<Pick<Todo, 'title' | 'completed'>>) =>
  request<Todo>(`/todos/${id}`, { method: 'PATCH', body: patch });
export const deleteTodo = (id: number) => request<void>(`/todos/${id}`, { method: 'DELETE' });
