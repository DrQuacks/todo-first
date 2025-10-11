// apps/web/src/App.tsx
import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { DataClient , Todo } from './dataClient';
import { restClient } from './dataClient.rest';
import { gqlClient } from './dataClient.gql';
import { API_BASE } from './dataClient';

type Mode = 'REST' | 'GraphQL';


export default function App() {
  const [mode, setMode] = useState<Mode>(() => (localStorage.getItem('mode') as Mode) || 'REST');
  useEffect(() => { localStorage.setItem('mode', mode); }, [mode]);
  const client: DataClient = useMemo(() => (mode === 'REST' ? restClient : gqlClient), [mode]);
  const endpoint = mode === 'REST' ? `${API_BASE}/todos` : `${API_BASE}/graphql`;
  const qc = useQueryClient();
  const { data: todos = [], isLoading, isError, error } = useQuery({ queryKey: ['todos',mode], queryFn: () => client.listTodos() });

  const add = useMutation({
    mutationFn: (title: string) => client.createTodo(title),
    onMutate: async (newTitle) => {
      await qc.cancelQueries({ queryKey: ['todos', mode] });
      const prev = qc.getQueryData<Todo[]>(['todos', mode]) || [];
      const optimistic: Todo = { id: Math.random(), title: newTitle, completed: false };
      qc.setQueryData(['todos', mode], [optimistic, ...prev]);
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(['todos', mode], ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ['todos', mode] }),
  });

  const toggle = useMutation({
    mutationFn: ({ id, completed }: { id: number; completed: boolean }) => client.updateTodo(id, { completed }),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: ['todos', mode] });
      const prev = qc.getQueryData<Todo[]>(['todos', mode]) || [];
      qc.setQueryData(['todos', mode], prev.map(t => (t.id === vars.id ? { ...t, completed: vars.completed } : t)));
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(['todos', mode], ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ['todos', mode] }),
  });

  const remove = useMutation({
    mutationFn: (id: number) => client.deleteTodo(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['todos', mode] });
      const prev = qc.getQueryData<Todo[]>(['todos', mode]) || [];
      qc.setQueryData(['todos', mode], prev.filter(t => t.id !== id));
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(['todos', mode], ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ['todos', mode] }),
  });

  return (
    <div style={{ maxWidth: 560, margin: '40px auto', fontFamily: 'system-ui' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0 }}>Todos</h1>
          {/* Endpoint badge */}
          <div style={{
            display: 'inline-block', marginTop: 6, padding: '2px 8px', borderRadius: 999,
            background: '#eef', fontSize: 12, color: '#334', border: '1px solid #ccd'
          }}>
            Using: <strong>{mode}</strong> · <code>{endpoint}</code>
          </div>
        </div>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span>Data Source:</span>
          <select value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
            <option value="REST">REST</option>
            <option value="GraphQL">GraphQL</option>
          </select>
        </label>
      </header>

      <Form onAdd={(title) => add.mutate(title)} pending={add.isPending} />

      {isLoading && <p>Loading…</p>}
      {isError && <p style={{ color: 'crimson' }}>{(error as Error).message}</p>}

      <ul>
        {todos.map((t) => (
          <li key={t.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={t.completed}
              onChange={(e) => toggle.mutate({ id: t.id, completed: e.target.checked })}
            />
            <span style={{ textDecoration: t.completed ? 'line-through' : 'none' }}>{t.title}</span>
            <button onClick={() => remove.mutate(t.id)} aria-label={`delete ${t.title}`}>delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Form({ onAdd, pending }: { onAdd: (title: string) => void; pending: boolean }) {
  const [title, setTitle] = useState('');
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); const t = title.trim(); if (t) onAdd(t); setTitle(''); }}
      style={{ display: 'flex', gap: 8 }}
    >
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add todo..." />
      <button type="submit" disabled={pending}>Add</button>
    </form>
  );
}