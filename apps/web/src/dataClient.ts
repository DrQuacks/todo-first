
// dataClient.ts (stays as contract + shared helpers)
export type Todo = { id: number; title: string; completed: boolean };

export interface DataClient {
  listTodos(): Promise<Todo[]>;
  createTodo(title: string): Promise<Todo>;
  updateTodo(id: number, patch: Partial<Pick<Todo, 'title' | 'completed'>>): Promise<Todo>;
  deleteTodo(id: number): Promise<void>;
}

// generic JSON fetch (shared by REST and can be used by GraphQL)
type JsonInit = Omit<RequestInit, 'body'> & { body?: unknown };
export const API_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || 'http://localhost:4000';

export async function jfetch<T>(path: string, init?: JsonInit): Promise<T> {
    const start = performance.now();
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const headers = new Headers(init?.headers as HeadersInit);
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

  let body: BodyInit | undefined;
  if (init?.body !== undefined) {
    body =
      typeof init.body === 'string' ||
      init.body instanceof FormData ||
      init.body instanceof URLSearchParams ||
      init.body instanceof Blob ||
      init.body instanceof ArrayBuffer ||
      ArrayBuffer.isView(init.body)
        ? (init.body as BodyInit)
        : JSON.stringify(init.body);
  }

  const res = await fetch(url, { ...init, headers, body });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  const ms = Math.round(performance.now() - start);
    // learn-logger
    const method = (init?.method ?? 'GET').toUpperCase();
    const mode = path.includes('graphql') ? 'GRAPHQL' : 'REST'
    // eslint-disable-next-line no-console
    console.log(`[${mode} ${method}] ${url} (${ms}ms)`, init?.body ?? '', '→', res.status);
  if (!res.ok) throw new Error((data?.error || data?.message) ?? `HTTP ${res.status}`);
  return data as T;
}
