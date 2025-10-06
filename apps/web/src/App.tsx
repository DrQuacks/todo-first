// apps/web/src/App.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listTodos, createTodo, updateTodo, deleteTodo, type Todo } from './api';

export default function App() {
  const qc = useQueryClient();
  const { data: todos = [], isLoading, isError, error } = useQuery({ queryKey: ['todos'], queryFn: listTodos });
  const [title, setTitle] = useState('');

  const add = useMutation({
    mutationFn: createTodo,
    onMutate: async (newTitle) => {
      await qc.cancelQueries({ queryKey: ['todos'] });
      const prev = qc.getQueryData<Todo[]>(['todos']) || [];
      const optimistic: Todo = { id: Math.random(), title: newTitle, completed: false };
      qc.setQueryData(['todos'], [optimistic, ...prev]);
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(['todos'], ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ['todos'] }),
  });

  const toggle = useMutation({
    mutationFn: ({ id, completed }: { id: number; completed: boolean }) => updateTodo(id, { completed }),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: ['todos'] });
      const prev = qc.getQueryData<Todo[]>(['todos']) || [];
      qc.setQueryData(['todos'], prev.map(t => (t.id === vars.id ? { ...t, completed: vars.completed } : t)));
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(['todos'], ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ['todos'] }),
  });

  const remove = useMutation({
    mutationFn: deleteTodo,
    onMutate: async (id: number) => {
      await qc.cancelQueries({ queryKey: ['todos'] });
      const prev = qc.getQueryData<Todo[]>(['todos']) || [];
      qc.setQueryData(['todos'], prev.filter(t => t.id !== id));
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(['todos'], ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ['todos'] }),
  });

  return (
    <div style={{ maxWidth: 560, margin: '40px auto', fontFamily: 'system-ui' }}>
      <h1>Todos</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const t = title.trim();
          if (t) add.mutate(t);
          setTitle('');
        }}
        style={{ display: 'flex', gap: 8 }}
      >
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add todo..." />
        <button type="submit" disabled={add.isPending}>Add</button>
      </form>

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
            <button onClick={() => remove.mutate(t.id)} aria-label={`delete ${t.title}`}>
              delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
