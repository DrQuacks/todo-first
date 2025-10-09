export type Todo = { id: number; title: string; completed: boolean };

export interface DataClient {
  listTodos(): Promise<Todo[]>;
  createTodo(title: string): Promise<Todo>;
  updateTodo(id: number, patch: Partial<Pick<Todo, 'title' | 'completed'>>): Promise<Todo>;
  deleteTodo(id: number): Promise<void>;
}


// Accept any body shape; we'll serialize it here.
// Using Omit<RequestInit, 'body'> so our 'body' definition wins over the DOM one.
type JsonInit = Omit<RequestInit, 'body'> & { body?: unknown };


// helper for base url (env or default)
export const API_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || 'http://localhost:4000';

// generic JSON fetcher
export async function jfetch<T>(url: string, init?: JsonInit): Promise<T> {
    const start = performance.now();
  
    // Build headers (preserve any the caller set)
    const headers = new Headers(init?.headers as HeadersInit);
    if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  
    // Serialize body only if provided and not already a string/FormData/etc.
    let body: BodyInit | undefined;
    if (init && 'body' in init && init.body !== undefined) {
      if (typeof init.body === 'string' ||
          init.body instanceof FormData ||
          init.body instanceof URLSearchParams ||
          init.body instanceof Blob ||
          init.body instanceof ArrayBuffer ||
          ArrayBuffer.isView(init.body)) {
        body = init.body as BodyInit;
      } else {
        body = JSON.stringify(init.body);
      }
    }
  
    const res = await fetch(url, { ...init, headers, body });
    const ms = Math.round(performance.now() - start);
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
  
    // learn-logger
    const method = (init?.method ?? 'GET').toUpperCase();
    // eslint-disable-next-line no-console
    console.log(`[REST ${method}] ${url} (${ms}ms)`, init?.body ?? '', '→', res.status);
  
    if (!res.ok) {
      throw new Error((data && (data.error || data.message)) || `HTTP ${res.status}`);
    }
    return data as T;
  }
