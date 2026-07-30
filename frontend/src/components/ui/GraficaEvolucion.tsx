import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';

interface Punto {
  fecha: string | Date;
  peso?: number;
  grasaCorporalPct?: number;
  masaMuscular?: number;
}

interface Props {
  data: Punto[];
  suficiente: boolean;
  loading?: boolean;
}

const CHART_COLORS = {
  grid: 'rgba(148, 163, 184, 0.18)',
  axis: '#94A3B8',
  peso: '#E2E8F0',
  grasa: '#4F9CFF',
  masa: '#34D399',
  tooltipBg: '#0B1220',
  tooltipBorder: 'rgba(79,156,255,0.25)',
  tooltipText: '#F1F5F9',
} as const;

export function GraficaEvolucion({ data, suficiente, loading }: Props) {
  const chartColors = CHART_COLORS;

  if (loading) {
    return (
      <div className="card-panel h-64 animate-pulse bg-silver/20" aria-busy="true" aria-label="Cargando gráfica" />
    );
  }

  if (!suficiente || data.length < 2) {
    return (
      <div className="card-panel flex h-64 flex-col items-center justify-center px-6 text-center">
        <p className="panel-text font-display text-xl tracking-wide">SIN DATOS SUFICIENTES</p>
        <p className="panel-muted mt-2 max-w-sm text-sm">
          Se necesitan al menos 2 evaluaciones para mostrar la evolución de peso, % grasa y masa muscular.
        </p>
      </div>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    fechaLabel: new Date(d.fecha).toLocaleDateString('es-DO', { month: 'short', day: 'numeric' }),
  }));

  return (
    <div className="card-panel">
      <h3 className="panel-text mb-4 font-display text-lg tracking-wider">EVOLUCIÓN</h3>
      <div className="h-64 w-full min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
            <XAxis dataKey="fechaLabel" tick={{ fontSize: 12, fill: chartColors.axis }} />
            <YAxis tick={{ fontSize: 12, fill: chartColors.axis }} />
            <Tooltip
              contentStyle={{
                backgroundColor: chartColors.tooltipBg,
                borderColor: chartColors.tooltipBorder,
                color: chartColors.tooltipText,
                borderRadius: 12,
              }}
              labelStyle={{ color: chartColors.tooltipText }}
            />
            <Legend wrapperStyle={{ color: chartColors.axis }} />
            <Line type="monotone" dataKey="peso" name="Peso" stroke={chartColors.peso} strokeWidth={2} dot />
            <Line type="monotone" dataKey="grasaCorporalPct" name="% Grasa" stroke={chartColors.grasa} strokeWidth={2} dot />
            <Line type="monotone" dataKey="masaMuscular" name="Masa muscular" stroke={chartColors.masa} strokeWidth={2} dot />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
