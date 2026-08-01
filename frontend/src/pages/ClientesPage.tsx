import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import {
  ClienteFormModal,
  type ClienteEditable,
  type ClienteFormData,
} from '../components/clientes/ClienteFormModal';
import { ClientStatusBadge } from '../components/clientes/ClientStatusBadge';

export function ClientesPage() {
  const [qInput, setQInput] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('all');
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingCliente, setEditingCliente] = useState<ClienteEditable | null>(null);
  const qc = useQueryClient();

  useEffect(() => {
    const t = setTimeout(() => {
      setQ(qInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [qInput]);

  const { data, isLoading } = useQuery({
    queryKey: ['clientes', q, page, status],
    queryFn: async () =>
      (await api.get('/clientes', { params: { q, page, limit: 20, status } })).data.data,
  });

  const closeModal = () => {
    setModalMode(null);
    setEditingCliente(null);
  };

  const openCreate = () => {
    setEditingCliente(null);
    setModalMode('create');
  };

  const openEdit = (cliente: ClienteEditable) => {
    setEditingCliente(cliente);
    setModalMode('edit');
  };

  const createMut = useMutation({
    mutationFn: async (values: ClienteFormData) => (await api.post('/clientes', values)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clientes'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      closeModal();
    },
  });

  const updateMut = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: ClienteFormData }) =>
      (await api.put(`/clientes/${id}`, values)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clientes'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      closeModal();
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => api.delete(`/clientes/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clientes'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const confirmDelete = (nombre: string, id: string) => {
    if (confirm(`¿Eliminar a ${nombre}? Se dará de baja lógica y dejará de aparecer en el listado.`)) {
      deleteMut.mutate(id);
    }
  };

  const handleSubmit = (values: ClienteFormData) => {
    if (modalMode === 'edit' && editingCliente) {
      updateMut.mutate({ id: editingCliente._id, values });
      return;
    }
    createMut.mutate(values);
  };

  const saving = createMut.isPending || updateMut.isPending;

  type ClienteRow = ClienteEditable & {
    codigoCliente: string;
    membershipStatus?: string;
    computedStatus?: string;
    progresoResumen?: {
      totalEvaluaciones: number;
      score: number | null;
      pesoKg: number | null;
      grasaPct: number | null;
      ultimaFecha: string | null;
    };
  };

  const summary = data?.summary || { active: 0, inactive: 0, paused: 0, cancelled: 0 };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="panel-text font-display text-fluid-xl tracking-wider">CLIENTES</h1>
          <p className="panel-muted text-sm">Activos e inactivos (pago) visibles · evaluaciones · progreso</p>
        </div>
        <button type="button" className="btn-primary" onClick={openCreate}>
          Nuevo cliente
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {(
          [
            ['all', 'Todos', (summary.active || 0) + (summary.inactive || 0) + (summary.paused || 0)],
            ['active', 'Activos', summary.active],
            ['inactive', 'Pago pendiente', summary.inactive],
            ['paused', 'Pausados', summary.paused],
          ] as const
        ).map(([key, label, count]) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setStatus(key);
              setPage(1);
            }}
            className={`card-panel !p-3 text-left transition ${status === key ? 'ring-1 ring-accent' : ''}`}
          >
            <p className="panel-muted text-xs uppercase tracking-wider">{label}</p>
            <p className="panel-text mt-1 font-display text-2xl">{count}</p>
          </button>
        ))}
      </div>

      <input
        className="input max-w-md"
        placeholder="Buscar por nombre o código…"
        value={qInput}
        onChange={(e) => setQInput(e.target.value)}
      />

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-silver/20" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-3 md:hidden">
            {(data?.items || []).map((c: ClienteRow) => (
              <div key={c._id} className="card-panel flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link to={`/clientes/${c._id}`} className="panel-text font-semibold">
                      {c.nombre}
                    </Link>
                    <p className="panel-muted text-xs">
                      {c.codigoCliente} · {c.edad} · {c.sexo}
                    </p>
                  </div>
                  <ClientStatusBadge status={c.computedStatus || c.membershipStatus} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link to={`/clientes/${c._id}`} className="btn-primary text-xs">
                    Ver progreso
                  </Link>
                  <button type="button" className="btn-ghost text-xs" onClick={() => openEdit(c)}>
                    Editar
                  </button>
                  <button
                    type="button"
                    className="btn-ghost text-xs text-danger"
                    disabled={deleteMut.isPending}
                    onClick={() => confirmDelete(c.nombre, c._id)}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="card-panel hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="panel-muted border-b border-[var(--cc-panel-border)] text-left">
                  <th className="py-2">Nombre</th>
                  <th>Estado</th>
                  <th>Código</th>
                  <th>Score</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {(data?.items || []).map((c: ClienteRow) => (
                  <tr key={c._id} className="border-b border-[var(--cc-panel-border)]/60">
                    <td className="py-3">
                      <Link to={`/clientes/${c._id}`} className="font-semibold hover:text-accent">
                        {c.nombre}
                      </Link>
                    </td>
                    <td>
                      <ClientStatusBadge status={c.computedStatus || c.membershipStatus} />
                    </td>
                    <td>{c.codigoCliente}</td>
                    <td>
                      {c.progresoResumen?.score != null ? (
                        <span className="font-semibold text-accent">{c.progresoResumen.score}%</span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="text-right">
                      <div className="flex justify-end gap-1">
                        <Link to={`/clientes/${c._id}`} className="min-h-touch px-2 text-xs font-semibold text-accent">
                          Progreso
                        </Link>
                        <button
                          type="button"
                          className="min-h-touch px-2 text-xs font-semibold text-accent"
                          onClick={() => openEdit(c)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="min-h-touch px-2 text-xs font-semibold text-danger"
                          disabled={deleteMut.isPending}
                          onClick={() => confirmDelete(c.nombre, c._id)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <button type="button" className="btn-ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Anterior
            </button>
            <span className="panel-muted text-sm">
              Página {page} / {data?.pages || 1}
            </span>
            <button
              type="button"
              className="btn-ghost"
              disabled={page >= (data?.pages || 1)}
              onClick={() => setPage((p) => p + 1)}
            >
              Siguiente
            </button>
          </div>
        </>
      )}

      <ClienteFormModal
        open={modalMode !== null}
        title={modalMode === 'edit' ? 'Editar cliente' : 'Nuevo cliente'}
        initial={editingCliente}
        saving={saving}
        onClose={closeModal}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
