import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

type PlanTipo = 'dieta' | 'rutina' | 'suplementacion' | 'protocolo' | 'recomendacion';

interface PlanItem {
  _id: string;
  tipo: PlanTipo;
  nombre: string;
  contenido: string;
  tags?: string[];
}

const TIPOS: PlanTipo[] = ['dieta', 'rutina', 'suplementacion', 'protocolo', 'recomendacion'];

export function PlanesPage() {
  const qc = useQueryClient();
  const [tipo, setTipo] = useState<string>('');
  const [form, setForm] = useState({
    tipo: 'dieta' as PlanTipo,
    nombre: '',
    contenido: '',
    tags: '',
  });
  const [assign, setAssign] = useState({ planId: '', clienteId: '', notas: '' });
  const [msg, setMsg] = useState('');

  const { data: planes, isLoading } = useQuery({
    queryKey: ['planes', tipo],
    queryFn: async () =>
      (await api.get('/planes', { params: tipo ? { tipo } : {} })).data.data as PlanItem[],
  });

  const { data: clientesData } = useQuery({
    queryKey: ['clientes-lite'],
    queryFn: async () => (await api.get('/clientes', { params: { limit: 100 } })).data.data,
  });

  const createMut = useMutation({
    mutationFn: async () =>
      api.post('/planes', {
        tipo: form.tipo,
        nombre: form.nombre,
        contenido: form.contenido,
        tags: form.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['planes'] });
      setForm({ tipo: 'dieta', nombre: '', contenido: '', tags: '' });
      setMsg('Plan creado.');
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => api.delete(`/planes/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['planes'] }),
  });

  const assignMut = useMutation({
    mutationFn: async () => api.post('/planes/asignar', assign),
    onSuccess: () => {
      setMsg('Plan asignado al cliente.');
      setAssign({ planId: '', clienteId: '', notas: '' });
    },
  });

  const clientes = useMemo(
    () => (clientesData?.items || []) as { _id: string; nombre: string }[],
    [clientesData]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="panel-text font-display text-fluid-xl tracking-wider">BIBLIOTECA DE PLANES</h1>
        <p className="panel-muted text-sm">Dietas, rutinas, protocolos y suplementación</p>
      </div>

      {msg && (
        <p className="panel-text rounded-xl bg-accent/10 px-4 py-3 text-sm" role="status">
          {msg}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={`btn-ghost text-xs ${!tipo ? 'text-accent' : ''}`}
          onClick={() => setTipo('')}
        >
          Todos
        </button>
        {TIPOS.map((t) => (
          <button
            key={t}
            type="button"
            className={`btn-ghost text-xs capitalize ${tipo === t ? 'text-accent' : ''}`}
            onClick={() => setTipo(t)}
          >
            {t}
          </button>
        ))}
      </div>

      <section className="card-panel grid gap-3 md:grid-cols-2">
        <div>
          <label className="label">Tipo</label>
          <select
            className="input"
            value={form.tipo}
            onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value as PlanTipo }))}
          >
            {TIPOS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Nombre</label>
          <input
            className="input"
            value={form.nombre}
            onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
          />
        </div>
        <div className="md:col-span-2">
          <label className="label">Contenido</label>
          <textarea
            className="input min-h-[140px]"
            value={form.contenido}
            onChange={(e) => setForm((f) => ({ ...f, contenido: e.target.value }))}
            placeholder="Texto estructurado (markdown/plain) — legible para IA futura"
          />
        </div>
        <div className="md:col-span-2">
          <label className="label">Tags (coma)</label>
          <input
            className="input"
            value={form.tags}
            onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
          />
        </div>
        <button
          type="button"
          className="btn-primary md:col-span-2"
          disabled={!form.nombre || !form.contenido || createMut.isPending}
          onClick={() => createMut.mutate()}
        >
          {createMut.isPending ? 'Guardando…' : 'Crear plan'}
        </button>
      </section>

      <section className="card-panel space-y-3">
        <h2 className="panel-text font-display text-lg tracking-wider">ASIGNAR A CLIENTE</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <select
            className="input"
            value={assign.planId}
            onChange={(e) => setAssign((a) => ({ ...a, planId: e.target.value }))}
          >
            <option value="">Plan…</option>
            {(planes || []).map((p) => (
              <option key={p._id} value={p._id}>
                {p.nombre}
              </option>
            ))}
          </select>
          <select
            className="input"
            value={assign.clienteId}
            onChange={(e) => setAssign((a) => ({ ...a, clienteId: e.target.value }))}
          >
            <option value="">Cliente…</option>
            {clientes.map((c) => (
              <option key={c._id} value={c._id}>
                {c.nombre}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn-primary"
            disabled={!assign.planId || !assign.clienteId || assignMut.isPending}
            onClick={() => assignMut.mutate()}
          >
            Asignar
          </button>
        </div>
      </section>

      {isLoading ? (
        <div className="h-24 animate-pulse rounded-2xl bg-silver/20" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {(planes || []).map((p) => (
            <article key={p._id} className="card-panel space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="panel-muted text-xs uppercase tracking-wider">{p.tipo}</p>
                  <h3 className="panel-text font-semibold">{p.nombre}</h3>
                </div>
                <button
                  type="button"
                  className="btn-ghost text-xs text-danger"
                  onClick={() => deleteMut.mutate(p._id)}
                >
                  Archivar
                </button>
              </div>
              <p className="panel-muted line-clamp-4 whitespace-pre-wrap text-sm">{p.contenido}</p>
              {!!p.tags?.length && (
                <p className="panel-muted text-xs">{p.tags.join(' · ')}</p>
              )}
            </article>
          ))}
          {(planes || []).length === 0 && (
            <p className="panel-muted text-sm">Sin planes aún. Crea el primero arriba.</p>
          )}
        </div>
      )}
    </div>
  );
}
