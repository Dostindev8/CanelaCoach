import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../../lib/api';

type Perfil = { nombre: string; email: string; membershipStatus?: string };
type EvalRow = {
  _id: string;
  fecha?: string;
  antropometria?: { peso?: number; imc?: number };
  resultadosCalculados?: { imc?: number };
};
type ReporteItem = { _id?: string; id?: string; titulo?: string; fecha?: string; generadoEn?: string; pdfUrl?: string };

export function DashboardClientePage() {
  const navigate = useNavigate();
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [evals, setEvals] = useState<EvalRow[]>([]);
  const [reportes, setReportes] = useState<ReporteItem[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [p, e, r] = await Promise.all([
          api.get('/cliente/portal/perfil'),
          api.get('/cliente/portal/evaluaciones'),
          api.get('/cliente/portal/reportes'),
        ]);
        if (cancelled) return;
        setPerfil(p.data.data);
        setEvals(e.data.data || []);
        const payload = r.data.data || {};
        const fromReports = (payload.reportes || []).map((rep: ReporteItem & { _id: string }) => ({
          _id: rep._id,
          titulo: rep.titulo || 'Reporte',
          generadoEn: rep.generadoEn,
        }));
        const fromEvals = (payload.evaluaciones || []).map(
          (ev: { id: string; fecha?: string; pdfUrl?: string }) => ({
            _id: ev.id,
            titulo: `Evaluación ${ev.fecha ? new Date(ev.fecha).toLocaleDateString('es-DO') : ''}`,
            fecha: ev.fecha,
            pdfUrl: ev.pdfUrl,
          })
        );
        setReportes([...fromReports, ...fromEvals]);
      } catch {
        if (!cancelled) {
          setError('Sesión no válida');
          navigate('/portal/login');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (loading) {
    return <p className="panel-muted">Cargando tu portal…</p>;
  }
  if (error || !perfil) {
    return <Navigate to="/portal/login" replace />;
  }

  const chartData = [...evals]
    .reverse()
    .map((ev) => ({
      fecha: ev.fecha ? new Date(ev.fecha).toLocaleDateString() : '—',
      imc: ev.resultadosCalculados?.imc ?? ev.antropometria?.imc ?? null,
      peso: ev.antropometria?.peso ?? null,
    }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="panel-text font-display text-fluid-xl tracking-wider">
          HOLA, {perfil.nombre.split(' ')[0].toUpperCase()}
        </h1>
        <p className="panel-muted text-sm">Tu progreso · solo lectura</p>
      </div>

      <section className="card-panel space-y-3">
        <h2 className="panel-text font-semibold">Progreso</h2>
        {chartData.length === 0 ? (
          <p className="panel-muted text-sm">Aún no hay evaluaciones registradas.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-1">
            <div className="h-64 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="fecha" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      background: '#0B0F17',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 12,
                    }}
                  />
                  <Line type="monotone" dataKey="imc" stroke="#38bdf8" strokeWidth={2} name="IMC" />
                  <Line type="monotone" dataKey="peso" stroke="#22d3ee" strokeWidth={2} name="Peso" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </section>

      <section className="card-panel space-y-3">
        <h2 className="panel-text font-semibold">Reportes</h2>
        {reportes.length === 0 ? (
          <p className="panel-muted text-sm">No hay reportes disponibles aún.</p>
        ) : (
          <ul className="space-y-2">
            {reportes.map((rep) => (
              <li
                key={rep._id}
                className="flex flex-col gap-2 border-b border-white/5 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="panel-text text-sm">{rep.titulo || 'Reporte'}</p>
                  <p className="panel-muted text-xs">
                    {rep.generadoEn || rep.fecha
                      ? new Date(String(rep.generadoEn || rep.fecha)).toLocaleString()
                      : ''}
                  </p>
                </div>
                <a
                  className="btn-ghost min-h-touch text-sm"
                  href={`/api/cliente/portal/reportes/${rep._id}/descargar`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Descargar
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="panel-muted text-center text-xs">
        <Link to="/portal/login" className="text-accent">
          ¿Problemas de acceso?
        </Link>
      </p>
    </div>
  );
}
