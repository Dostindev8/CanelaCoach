import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export function AgendaPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ clienteId: '', fecha: '', notas: '' });
  const [msg, setMsg] = useState('');

  const range = useMemo(() => {
    const from = new Date();
    from.setDate(1);
    from.setHours(0, 0, 0, 0);
    const to = new Date(from);
    to.setMonth(to.getMonth() + 2);
    return { from: from.toISOString(), to: to.toISOString() };
  }, []);

  const { data: citas, isLoading } = useQuery({
    queryKey: ['citas', range.from],
    queryFn: async () =>
      (await api.get('/citas', { params: { from: range.from, to: range.to } })).data.data,
  });

  const { data: clientesData } = useQuery({
    queryKey: ['clientes-lite'],
    queryFn: async () => (await api.get('/clientes', { params: { limit: 100 } })).data.data,
  });

  const createMut = useMutation({
    mutationFn: async () =>
      api.post('/citas', {
        clienteId: form.clienteId,
        fecha: new Date(form.fecha).toISOString(),
        notas: form.notas || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['citas'] });
      setForm({ clienteId: '', fecha: '', notas: '' });
      setMsg('Cita programada.');
    },
  });

  const cancelMut = useMutation({
    mutationFn: async (id: string) => api.delete(`/citas/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['citas'] }),
  });

  const clientes = (clientesData?.items || []) as { _id: string; nombre: string }[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="panel-text font-display text-fluid-xl tracking-wider">AGENDA</h1>
        <p className="panel-muted text-sm">Citas y seguimiento · próximo bimestre</p>
      </div>

      {msg && (
        <p className="panel-text rounded-xl bg-accent/10 px-4 py-3 text-sm" role="status">
          {msg}
        </p>
      )}

      <section className="card-panel grid gap-3 md:grid-cols-2">
        <div>
          <label className="label">Cliente</label>
          <select
            className="input"
            value={form.clienteId}
            onChange={(e) => setForm((f) => ({ ...f, clienteId: e.target.value }))}
          >
            <option value="">Seleccionar…</option>
            {clientes.map((c) => (
              <option key={c._id} value={c._id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Fecha y hora</label>
          <input
            className="input"
            type="datetime-local"
            value={form.fecha}
            onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))}
          />
        </div>
        <div className="md:col-span-2">
          <label className="label">Notas</label>
          <input
            className="input"
            value={form.notas}
            onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))}
          />
        </div>
        <button
          type="button"
          className="btn-primary md:col-span-2"
          disabled={!form.clienteId || !form.fecha || createMut.isPending}
          onClick={() => createMut.mutate()}
        >
          Programar cita
        </button>
      </section>

      {/* TODO: Fase futura — gestión de pagos */}

      {isLoading ? (
        <div className="h-24 animate-pulse rounded-2xl bg-silver/20" />
      ) : (
        <ol className="card-panel space-y-3">
          {(citas || []).map(
            (c: {
              _id: string;
              fecha: string;
              estado: string;
              notas?: string;
              clienteId?: { nombre?: string; telefono?: string };
            }) => (
              <li
                key={c._id}
                className="flex flex-col justify-between gap-2 border-b border-[var(--cc-panel-border)] pb-3 sm:flex-row sm:items-center"
              >
                <div>
                  <p className="panel-text font-semibold">
                    {c.clienteId?.nombre || 'Cliente'} ·{' '}
                    {new Date(c.fecha).toLocaleString('es-DO')}
                  </p>
                  <p className="panel-muted text-xs capitalize">
                    {c.estado}
                    {c.notas ? ` · ${c.notas}` : ''}
                  </p>
                </div>
                {c.estado === 'programada' && (
                  <button
                    type="button"
                    className="btn-ghost text-xs text-danger"
                    onClick={() => cancelMut.mutate(c._id)}
                  >
                    Cancelar
                  </button>
                )}
              </li>
            )
          )}
          {(citas || []).length === 0 && (
            <p className="panel-muted text-sm">Sin citas programadas.</p>
          )}
        </ol>
      )}
    </div>
  );
}
