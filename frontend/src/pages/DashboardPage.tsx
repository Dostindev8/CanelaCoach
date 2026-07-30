import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { StatCard } from '../components/ui/StatCard';

export function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => (await api.get('/dashboard/resumen')).data.data,
  });

  if (isLoading) {
    return <div className="grid gap-4 md:grid-cols-4">{[1, 2, 3, 4].map((i) => <div key={i} className="h-28 rounded-2xl bg-silver/20 animate-pulse" />)}</div>;
  }

  const kpis = data?.kpis || {};

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-fluid-xl tracking-[0.08em] uppercase font-bold panel-text">
          Dashboard
        </h1>
        <p className="panel-muted mt-1">Resumen operativo de tu cartera de clientes</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-3 2xl:grid-cols-6">
        {[
          { label: 'Clientes activos', value: kpis.clientesActivos },
          { label: 'Total clientes', value: kpis.totalClientes },
          { label: 'Evaluaciones', value: kpis.totalEvaluaciones },
          { label: 'Este mes', value: kpis.evaluacionesMes },
          { label: 'Score promedio', value: kpis.scorePromedio != null ? `${kpis.scorePromedio}%` : '—' },
          { label: 'Adherencia 30d', value: kpis.adherencia30d != null ? `${kpis.adherencia30d}%` : '—' },
        ].map((k) => (
          <StatCard key={k.label} label={k.label} value={k.value ?? 0} />
        ))}
      </div>

      <section className="card-panel">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="panel-text font-display text-lg tracking-wider">REEVALUACIÓN (&gt;30 DÍAS)</h2>
          <Link to="/clientes" className="btn-primary text-sm !min-h-touch !py-2">
            Ver clientes
          </Link>
        </div>
        {(data?.necesitanReevaluacion || []).length === 0 ? (
          <p className="panel-muted text-sm">Ningún cliente pendiente de reevaluación.</p>
        ) : (
          <ul className="divide-y divide-[var(--cc-panel-border)]">
            {data.necesitanReevaluacion.map((c: { clienteId: string; nombre: string; codigoCliente: string; diasSinEvaluacion: number }) => (
              <li key={c.clienteId} className="py-3 flex items-center justify-between gap-3">
                <div>
                  <Link to={`/clientes/${c.clienteId}`} className="font-semibold panel-text hover:text-accent">
                    {c.nombre}
                  </Link>
                  <p className="panel-muted text-xs">{c.codigoCliente}</p>
                </div>
                <span className="text-sm font-semibold text-warn">{c.diasSinEvaluacion} días</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
