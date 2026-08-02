import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { ActionButton } from '../components/ui/ActionButton';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { SectionCard } from '../components/ui/SectionCard';
import { TabPill } from '../components/ui/TabPill';

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
      <PageHeader
        title="Biblioteca de planes"
        subtitle="Dietas, rutinas, protocolos y suplementación"
      />

      {msg && (
        <p className="panel-text rounded-xl bg-accent/10 px-4 py-3 text-sm" role="status">
          {msg}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <TabPill label="Todos" active={!tipo} onClick={() => setTipo('')} />
        {TIPOS.map((t) => (
          <TabPill
            key={t}
            label={t}
            active={tipo === t}
            onClick={() => setTipo(t)}
            className="capitalize"
          />
        ))}
      </div>

      <SectionCard title="Nuevo plan">
        <div className="grid gap-3 md:grid-cols-2">
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
              placeholder="Texto estructurado (markdown/plain)"
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
          <ActionButton
            className="md:col-span-2"
            label={createMut.isPending ? 'Guardando…' : 'Crear plan'}
            disabled={!form.nombre || !form.contenido || createMut.isPending}
            onClick={() => createMut.mutate()}
          />
        </div>
      </SectionCard>

      <SectionCard title="Asignar a cliente">
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
          <ActionButton
            label="Asignar"
            disabled={!assign.planId || !assign.clienteId || assignMut.isPending}
            onClick={() => assignMut.mutate()}
          />
        </div>
      </SectionCard>

      {isLoading ? (
        <div className="card-panel h-24 animate-pulse bg-white/5" />
      ) : (planes || []).length === 0 ? (
        <EmptyState
          title="Sin planes aún"
          description="Crea el primero con el formulario de arriba para asignarlo a tus clientes."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {(planes || []).map((p) => (
            <article key={p._id} className="card-panel space-y-2 transition duration-micro hover:bg-white/[0.02]">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="panel-muted text-xs uppercase tracking-wider">{p.tipo}</p>
                  <h3 className="panel-text font-semibold">{p.nombre}</h3>
                </div>
                <ActionButton
                  variant="destructive"
                  className="text-xs"
                  label="Archivar"
                  onClick={() => deleteMut.mutate(p._id)}
                />
              </div>
              <p className="panel-muted line-clamp-4 whitespace-pre-wrap text-sm">{p.contenido}</p>
              {!!p.tags?.length && <p className="panel-muted text-xs">{p.tags.join(' · ')}</p>}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
