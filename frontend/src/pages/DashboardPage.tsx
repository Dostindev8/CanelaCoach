import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { SectionCard } from '../components/ui/SectionCard';
import { StatCard } from '../components/ui/StatCard';

export function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => (await api.get('/dashboard/resumen')).data.data,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="card-panel h-28 animate-pulse bg-white/5" />
        ))}
      </div>
    );
  }

  const kpis = data?.kpis || {};
  const pending = data?.necesitanReevaluacion || [];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        subtitle="Resumen operativo de tu cartera de clientes"
        actions={
          <Link to="/clientes" className="btn-primary text-sm">
            Ver clientes
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-3 xs:grid-cols-2 md:gap-4 xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard label="Clientes activos" value={kpis.clientesActivos ?? 0} tone="green" />
        <StatCard label="Total clientes" value={kpis.totalClientes ?? 0} tone="blue" />
        <StatCard label="Evaluaciones" value={kpis.totalEvaluaciones ?? 0} tone="blue" />
        <StatCard label="Este mes" value={kpis.evaluacionesMes ?? 0} tone="amber" />
        <StatCard
          label="Score promedio"
          value={kpis.scorePromedio != null ? `${kpis.scorePromedio}%` : '—'}
          tone="blue"
        />
        <StatCard
          label="Adherencia 30d"
          value={kpis.adherencia30d != null ? `${kpis.adherencia30d}%` : '—'}
          tone="green"
        />
      </div>

      <SectionCard
        title="Reevaluación (>30 días)"
        actions={
          <Link to="/clientes" className="btn-ghost text-sm">
            Ir a clientes
          </Link>
        }
      >
        {pending.length === 0 ? (
          <EmptyState
            title="Ningún cliente pendiente de reevaluación"
            description="Cuando alguien pase 30 días sin evaluación, aparecerá aquí."
            action={
              <Link to="/clientes" className="btn-primary text-sm">
                Abrir clientes
              </Link>
            }
            className="!border-0 !bg-transparent !p-0 !shadow-none"
          />
        ) : (
          <ul className="divide-y divide-[var(--cc-panel-border)]">
            {pending.map(
              (c: {
                clienteId: string;
                nombre: string;
                codigoCliente: string;
                diasSinEvaluacion: number;
              }) => (
                <li key={c.clienteId} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <Link
                      to={`/clientes/${c.clienteId}`}
                      className="panel-text font-semibold transition hover:text-accent"
                    >
                      {c.nombre}
                    </Link>
                    <p className="panel-muted text-xs">{c.codigoCliente}</p>
                  </div>
                  <span className="text-sm font-semibold text-warn">{c.diasSinEvaluacion} días</span>
                </li>
              )
            )}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
