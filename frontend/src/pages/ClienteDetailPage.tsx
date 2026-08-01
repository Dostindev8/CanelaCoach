import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useState } from 'react';
import {
  ClienteFormModal,
  type ClienteFormData,
} from '../components/clientes/ClienteFormModal';
import {
  ClienteProgresoPanel,
  type ClienteProgreso,
} from '../components/clientes/ClienteProgresoPanel';
import { ClientStatusBadge } from '../components/clientes/ClientStatusBadge';
import { MembresiaPanel } from '../components/clientes/MembresiaPanel';

type EvaluacionRow = {
  _id: string;
  fecha: string;
  tipo: string;
  scoreFisico?: { valor: number; delta: number };
  reporte?: { pdfUrl?: string; mensualPdfUrl?: string; enviado?: boolean };
  fotografias?: { frenteUrl?: string; perfilDerechoUrl?: string; espaldaUrl?: string };
};

type TimelineItem = {
  tipo: string;
  fecha: string;
  titulo: string;
  detalle?: string;
  id?: string;
  score?: number;
};

export function ClienteDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [sending, setSending] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [compareFrom, setCompareFrom] = useState('');
  const [compareTo, setCompareTo] = useState('');

  const inviteMut = useMutation({
    mutationFn: async () =>
      (await api.post('/cliente/auth/codigos-invitacion', { clienteId: id })).data.data as {
        codigo: string;
        registroUrl: string;
        expiraEn: string;
      },
    onSuccess: (data) => {
      setMsg(
        `Código portal: ${data.codigo} · Link: ${data.registroUrl} (expira ${new Date(data.expiraEn).toLocaleDateString('es-DO')})`
      );
      void navigator.clipboard?.writeText(data.registroUrl).catch(() => undefined);
    },
    onError: () => setMsg('No se pudo generar el código de invitación.'),
  });

  const { data: cliente, isLoading } = useQuery({
    queryKey: ['cliente', id],
    queryFn: async () => (await api.get(`/clientes/${id}`)).data.data,
    enabled: !!id,
  });

  const { data: expediente, isLoading: loadingExp } = useQuery({
    queryKey: ['expediente', id],
    queryFn: async () => (await api.get(`/clientes/${id}/expediente`)).data.data,
    enabled: !!id,
  });

  const { data: evaluaciones } = useQuery({
    queryKey: ['evaluaciones', id],
    queryFn: async () => (await api.get(`/clientes/${id}/evaluaciones`)).data.data as EvaluacionRow[],
    enabled: !!id,
  });

  const progreso: ClienteProgreso | undefined =
    expediente?.progreso || cliente?.progreso;

  const updateMut = useMutation({
    mutationFn: async (values: ClienteFormData) => (await api.put(`/clientes/${id}`, values)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cliente', id] });
      qc.invalidateQueries({ queryKey: ['expediente', id] });
      qc.invalidateQueries({ queryKey: ['clientes'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setEditOpen(false);
      setMsg('Cliente actualizado correctamente.');
    },
  });

  const deleteMut = useMutation({
    mutationFn: async () => api.delete(`/clientes/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clientes'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      navigate('/clientes');
    },
  });

  const generarMut = useMutation({
    mutationFn: async (evalId: string) => api.post(`/evaluaciones/${evalId}/generar-reporte`),
    onSuccess: () => setMsg('Reporte encolado. Te avisaremos cuando esté listo.'),
  });

  const exportPdfMut = useMutation({
    mutationFn: async (evalId: string) => {
      const res = await api.get(`/evaluaciones/${evalId}/export.pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `evaluacion-${evalId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      return evalId;
    },
    onSuccess: () => {
      setMsg('PDF de evaluación descargado (individual por cliente).');
      qc.invalidateQueries({ queryKey: ['evaluaciones', id] });
      qc.invalidateQueries({ queryKey: ['expediente', id] });
    },
    onError: () => setMsg('Error al exportar PDF'),
  });

  const enviarMut = useMutation({
    mutationFn: async (evalId: string) => {
      setSending(evalId);
      return (await api.post(`/evaluaciones/${evalId}/enviar-reporte`)).data.data;
    },
    onSuccess: (data) => {
      setMsg(`Enviado a ${data.email}${data.simulated ? ' (simulado)' : ''} · ${new Date().toLocaleString()}`);
      qc.invalidateQueries({ queryKey: ['evaluaciones', id] });
      qc.invalidateQueries({ queryKey: ['expediente', id] });
    },
    onError: (err: unknown) => {
      const m =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ||
        'Error al enviar';
      setMsg(m);
    },
    onSettled: () => setSending(null),
  });

  const handleDelete = () => {
    if (!cliente) return;
    if (confirm(`¿Eliminar a ${cliente.nombre}? Se dará de baja lógica.`)) {
      deleteMut.mutate();
    }
  };

  if (isLoading) return <div className="h-40 animate-pulse rounded-2xl bg-silver/20" />;
  if (!cliente) return <p>Cliente no encontrado</p>;

  const evalList: EvaluacionRow[] = evaluaciones || expediente?.evaluaciones || [];
  const timeline: TimelineItem[] = expediente?.timeline || [];
  const planesActivos = (expediente?.planes || []).length;
  const citasCount = (expediente?.citas || []).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <Link to="/clientes" className="text-sm text-accent hover:opacity-90">
            ← Clientes
          </Link>
          <h1 className="panel-text mt-1 font-display text-fluid-xl tracking-wider">{cliente.nombre}</h1>
          <p className="panel-muted text-sm">
            {cliente.codigoCliente} · {cliente.edad} años · {cliente.sexo}
          </p>
          <div className="mt-2">
            <ClientStatusBadge status={cliente.computedStatus || cliente.membershipStatus} />
          </div>
          {cliente.email && <p className="panel-muted mt-1 text-sm">{cliente.email}</p>}
          {cliente.telefono && <p className="panel-muted text-sm">{cliente.telefono}</p>}
          {cliente.objetivo && <p className="panel-text mt-2 opacity-80">{cliente.objetivo}</p>}
          <div className="panel-muted mt-3 flex flex-wrap gap-3 text-xs">
            <span>{evalList.length} evaluaciones</span>
            <span>{planesActivos} planes activos</span>
            <span>{citasCount} citas</span>
            {cliente.tieneCuestionario && <span>Cuestionario ✓</span>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to={`/clientes/${id}/cuestionario-ingreso`} className="btn-ghost">
            {cliente.tieneCuestionario ? 'Ver cuestionario' : 'Cuestionario ingreso'}
          </Link>
          <Link to={`/clientes/${id}/protocolo`} className="btn-ghost">
            Protocolo
          </Link>
          <button type="button" className="btn-ghost" onClick={() => setEditOpen(true)}>
            Editar
          </button>
          <button
            type="button"
            className="btn-ghost"
            disabled={inviteMut.isPending}
            onClick={() => inviteMut.mutate()}
          >
            {inviteMut.isPending ? 'Generando…' : 'Invitar al portal'}
          </button>
          <button
            type="button"
            className="btn-ghost text-danger"
            disabled={deleteMut.isPending}
            onClick={handleDelete}
          >
            {deleteMut.isPending ? 'Eliminando…' : 'Eliminar'}
          </button>
          <Link to={`/clientes/${id}/evaluacion/nueva`} className="btn-primary">
            Nueva evaluación
          </Link>
        </div>
      </div>

      {msg && (
        <p className="panel-text rounded-xl bg-accent/10 px-4 py-3 text-sm" role="status" aria-live="polite">
          {msg}
        </p>
      )}

      <MembresiaPanel clienteId={id!} cliente={cliente} onDone={() => {
        qc.invalidateQueries({ queryKey: ['cliente', id] });
        qc.invalidateQueries({ queryKey: ['clientes'] });
        setMsg('Membresía / pago actualizado.');
      }} />

      {progreso && id && (
        <ClienteProgresoPanel clienteId={id} progreso={progreso} loading={loadingExp && !progreso} />
      )}

      {(evalList || []).length >= 2 && (
        <section className="card-panel space-y-3">
          <h2 className="panel-text font-display text-lg tracking-wider">COMPARAR EVALUACIONES</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Desde</label>
              <select className="input" value={compareFrom} onChange={(e) => setCompareFrom(e.target.value)}>
                <option value="">Seleccionar…</option>
                {evalList.map((e) => (
                  <option key={e._id} value={e._id}>
                    {new Date(e.fecha).toLocaleDateString('es-DO')}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Hasta</label>
              <select className="input" value={compareTo} onChange={(e) => setCompareTo(e.target.value)}>
                <option value="">Seleccionar…</option>
                {evalList.map((e) => (
                  <option key={e._id} value={e._id}>
                    {new Date(e.fecha).toLocaleDateString('es-DO')}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button
            type="button"
            className="btn-primary"
            disabled={!compareFrom || !compareTo || compareFrom === compareTo}
            onClick={() => navigate(`/clientes/${id}/evaluaciones/${compareTo}/reporte?from=${compareFrom}`)}
          >
            Ver comparativa
          </button>
        </section>
      )}

      <section className="card-panel">
        <h2 className="panel-text mb-4 font-display text-lg tracking-wider">GALERÍA EVOLUCIÓN</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {evalList
            .flatMap((e) => {
              const f = e.fotografias || {};
              return [
                f.frenteUrl && { url: f.frenteUrl, label: `Frente · ${new Date(e.fecha).toLocaleDateString('es-DO')}` },
                f.perfilDerechoUrl && {
                  url: f.perfilDerechoUrl,
                  label: `Perfil · ${new Date(e.fecha).toLocaleDateString('es-DO')}`,
                },
                f.espaldaUrl && {
                  url: f.espaldaUrl,
                  label: `Espalda · ${new Date(e.fecha).toLocaleDateString('es-DO')}`,
                },
              ].filter(Boolean) as { url: string; label: string }[];
            })
            .map((f, i) => (
              <figure key={`${f.url}-${i}`} className="overflow-hidden rounded-xl bg-black/20">
                <img src={f.url} alt={f.label} className="h-40 w-full object-contain" />
                <figcaption className="panel-muted p-2 text-xs">{f.label}</figcaption>
              </figure>
            ))}
          {evalList.every((e) => !e.fotografias?.frenteUrl && !e.fotografias?.perfilDerechoUrl && !e.fotografias?.espaldaUrl) && (
            <p className="panel-muted col-span-full text-sm">Sin fotografías de evolución aún.</p>
          )}
        </div>
      </section>

      <section className="card-panel">
        <h2 className="panel-text mb-4 font-display text-lg tracking-wider">EXPEDIENTE · LÍNEA DE TIEMPO</h2>
        {loadingExp && timeline.length === 0 ? (
          <div className="h-24 animate-pulse rounded-xl bg-silver/20" />
        ) : (
          <ol className="space-y-3">
            {timeline.map((item, idx) => (
              <li
                key={`${item.tipo}-${item.id || idx}-${item.fecha}`}
                className="flex flex-col gap-1 border-b border-[var(--cc-panel-border)] pb-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="panel-text text-sm font-semibold">{item.titulo}</p>
                  <p className="panel-muted text-xs">
                    {new Date(item.fecha).toLocaleDateString('es-DO')}
                    {item.detalle ? ` · ${item.detalle}` : ''}
                  </p>
                </div>
                {item.tipo === 'evaluacion' && item.id && (
                  <div className="flex items-center gap-2">
                    {item.score != null && (
                      <span className="text-sm font-semibold text-accent">Score {item.score}%</span>
                    )}
                    <Link
                      to={`/clientes/${id}/evaluaciones/${item.id}/reporte`}
                      className="btn-ghost text-xs"
                    >
                      Ver
                    </Link>
                  </div>
                )}
              </li>
            ))}
            {timeline.length === 0 && (
              <p className="panel-muted text-sm">El expediente se irá llenando con evaluaciones, planes y citas.</p>
            )}
          </ol>
        )}
      </section>

      <section className="card-panel">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="panel-text font-display text-lg tracking-wider">EVALUACIONES DEL CLIENTE</h2>
          <Link to={`/clientes/${id}/evaluacion/nueva`} className="btn-primary text-sm">
            + Nueva
          </Link>
        </div>
        <ol className="space-y-4">
          {evalList.map((e) => (
            <li
              key={e._id}
              className="flex flex-col justify-between gap-3 border-b border-[var(--cc-panel-border)] pb-4 sm:flex-row sm:items-center"
            >
              <div>
                <p className="panel-text font-semibold">{new Date(e.fecha).toLocaleDateString('es-DO')}</p>
                <p className="panel-muted text-xs capitalize">{e.tipo}</p>
                {e.scoreFisico?.valor != null && (
                  <p className="mt-1 text-sm font-semibold text-accent">
                    Score {e.scoreFisico.valor}%
                    {e.scoreFisico.delta != null && e.scoreFisico.delta !== 0
                      ? ` (${e.scoreFisico.delta > 0 ? '+' : ''}${e.scoreFisico.delta})`
                      : ''}
                  </p>
                )}
                {e.reporte?.pdfUrl && (
                  <a href={e.reporte.pdfUrl} target="_blank" rel="noreferrer" className="mr-3 text-sm text-accent">
                    Ver PDF clínico
                  </a>
                )}
                {e.reporte?.mensualPdfUrl && (
                  <a href={e.reporte.mensualPdfUrl} target="_blank" rel="noreferrer" className="text-sm text-accent">
                    PDF mensual
                  </a>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Link to={`/clientes/${id}/evaluaciones/${e._id}/reporte`} className="btn-primary text-sm">
                  Ver reporte
                </Link>
                <button
                  type="button"
                  className="btn-ghost text-sm"
                  disabled={exportPdfMut.isPending}
                  onClick={() => exportPdfMut.mutate(e._id)}
                >
                  PDF individual
                </button>
                <button type="button" className="btn-ghost text-sm" onClick={() => generarMut.mutate(e._id)}>
                  Generar PDF clínico
                </button>
                <button
                  type="button"
                  className="btn-ghost text-sm"
                  disabled={sending === e._id}
                  onClick={() => enviarMut.mutate(e._id)}
                >
                  {sending === e._id ? 'Enviando…' : 'Enviar al cliente'}
                </button>
                {e.reporte?.pdfUrl && cliente.telefono && (
                  <a
                    className="btn-ghost text-sm"
                    href={`https://wa.me/${String(cliente.telefono).replace(/\D/g, '')}?text=${encodeURIComponent(
                      `Hola ${cliente.nombre}, tu reporte Canela Coach®: ${e.reporte.pdfUrl}`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    WhatsApp
                  </a>
                )}
              </div>
            </li>
          ))}
          {evalList.length === 0 && (
            <p className="panel-muted text-sm">
              Sin evaluaciones aún.{' '}
              <Link to={`/clientes/${id}/evaluacion/nueva`} className="text-accent">
                Crear la primera
              </Link>
            </p>
          )}
        </ol>
      </section>

      <ClienteFormModal
        open={editOpen}
        title="Editar cliente"
        initial={cliente}
        saving={updateMut.isPending}
        onClose={() => setEditOpen(false)}
        onSubmit={(values) => updateMut.mutate(values)}
      />
    </div>
  );
}
