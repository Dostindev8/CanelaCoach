import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import { api } from '../lib/api';
import { ScoreGauge } from '../components/ui/ScoreGauge';
import { useState } from 'react';

function kgToLb(kg: number) {
  return +(kg * 2.20462).toFixed(1);
}

function fmtDate(d?: string | Date | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-DO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function DeltaText({
  cambio,
  unit,
  goodWhenDown = true,
}: {
  cambio: number | null | undefined;
  unit: string;
  goodWhenDown?: boolean;
}) {
  if (cambio == null) return <span className="panel-muted">—</span>;
  const good = goodWhenDown ? cambio < 0 : cambio > 0;
  const arrow = cambio < 0 ? '↓' : cambio > 0 ? '↑' : '→';
  return (
    <span className={good ? 'font-semibold text-accent' : cambio === 0 ? 'panel-muted' : 'font-semibold text-amber-400'}>
      {arrow} {Math.abs(cambio).toFixed(1)} {unit}
    </span>
  );
}

const MEDIDA_ROWS: { key: string; label: string }[] = [
  { key: 'cuelloCm', label: 'Cuello' },
  { key: 'toraxCm', label: 'Torso' },
  { key: 'bicepsCm', label: 'Bíceps' },
  { key: 'cinturaCm', label: 'Cintura' },
  { key: 'gluteosCm', label: 'Glúteos' },
  { key: 'cuadricepsCm', label: 'Cuádriceps' },
  { key: 'pantorrillaCm', label: 'Pantorrillas' },
];

export function EvaluationReportPage() {
  const { id: clienteId, evalId } = useParams();
  const [searchParams] = useSearchParams();
  const fromId = searchParams.get('from') || '';
  const [exportMsg, setExportMsg] = useState('');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['comparativa', evalId, fromId],
    queryFn: async () => {
      if (fromId && evalId) {
        const { data: cmp } = await api.get('/evaluaciones/compare', {
          params: { from: fromId, to: evalId },
        });
        const { data: hist } = await api.get(`/evaluaciones/${evalId}/comparativa`);
        return {
          ...hist.data,
          comparison: cmp.data.comparison,
          evaluacion: cmp.data.to,
          anterior: cmp.data.from,
        };
      }
      return (await api.get(`/evaluaciones/${evalId}/comparativa`)).data.data;
    },
    enabled: !!evalId,
  });

  const { data: cliente } = useQuery({
    queryKey: ['cliente', clienteId],
    queryFn: async () => (await api.get(`/clientes/${clienteId}`)).data.data,
    enabled: !!clienteId,
  });

  const pdfMut = useMutation({
    mutationFn: async () => (await api.post(`/evaluaciones/${evalId}/generar-reporte-mensual`)).data.data,
    onSuccess: (d) => {
      setExportMsg('PDF mensual listo');
      if (d.mensualPdfUrl) window.open(d.mensualPdfUrl, '_blank');
    },
    onError: () => setExportMsg('Error al generar PDF mensual'),
  });

  const clinicoMut = useMutation({
    mutationFn: async () => api.post(`/evaluaciones/${evalId}/generar-reporte`),
    onSuccess: () => setExportMsg('PDF clínico encolado'),
  });

  const downloadWord = async () => {
    setExportMsg('Generando Word…');
    try {
      const res = await api.get(`/evaluaciones/${evalId}/export/docx`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte-canela-${evalId}.docx`;
      a.click();
      URL.revokeObjectURL(url);
      setExportMsg('Word descargado');
    } catch {
      setExportMsg('Error al descargar Word');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl bg-silver/20" />
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="card-panel space-y-3 text-center">
        <p className="panel-text">No se pudo cargar el reporte.</p>
        <button type="button" className="btn-primary" onClick={() => void refetch()}>
          Reintentar
        </button>
      </div>
    );
  }

  const comparison = data.comparison;
  const tieneAnterior = comparison?.tieneAnterior;
  const score = comparison?.scoreFisico || data.evaluacion?.scoreFisico;
  const serie = data.reporteMensual?.serieHistorica || [];

  const barData = MEDIDA_ROWS.map(({ key, label }) => {
    const m = comparison?.medidas?.[key];
    return {
      name: label,
      anterior: m?.anterior ?? 0,
      actual: m?.actual ?? 0,
    };
  });

  const estaturaCm = data.evaluacion?.antropometria?.estatura
    ? Math.round(data.evaluacion.antropometria.estatura * 100)
    : null;

  const celebracionMsg =
    score?.celebracion
      ? '¡EXCELENTE PROGRESO!'
      : score?.delta != null && score.delta < 0
        ? 'AJUSTEMOS EL RUMBO'
        : 'SIGUE CON DISCIPLINA';

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link to={`/clientes/${clienteId}`} className="text-sm text-accent">
            ← Cliente
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <img src="/Canelalogo.webp" alt="" className="h-10 w-10 object-contain" />
            <div>
              <p className="font-display text-xs tracking-[0.14em] text-accent">CANELA COACH®</p>
              <h1 className="panel-text font-display text-fluid-lg italic tracking-wide">
                REPORTE MENSUAL DE AVANCES
              </h1>
            </div>
          </div>
        </div>
        <div className="card-panel !p-3 text-center">
          <p className="panel-muted text-[10px] uppercase tracking-wider">Fecha de evaluación</p>
          <p className="panel-text font-semibold">{fmtDate(comparison?.fechaActual)}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-primary text-sm"
          disabled={pdfMut.isPending}
          onClick={() => pdfMut.mutate()}
        >
          {pdfMut.isPending ? 'Generando PDF…' : 'Descargar PDF mensual'}
        </button>
        <button type="button" className="btn-ghost text-sm" onClick={() => void downloadWord()}>
          Descargar Word
        </button>
        <button
          type="button"
          className="btn-ghost text-sm"
          disabled={clinicoMut.isPending}
          onClick={() => clinicoMut.mutate()}
        >
          Generar PDF clínico
        </button>
      </div>
      {exportMsg && (
        <p className="text-sm text-accent" role="status">
          {exportMsg}
        </p>
      )}

      {!tieneAnterior && (
        <p className="rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm panel-text">
          Primera evaluación — sin comparativa disponible todavía. El score base es 50%.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card-panel flex flex-col items-start gap-3 sm:flex-row sm:items-center lg:col-span-1">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-accent/30 bg-white/5 text-2xl">
            {cliente?.sexo === 'Femenino' ? '♀' : '♂'}
          </div>
          <div>
            <p className="panel-text font-display text-lg tracking-wider">{cliente?.nombre}</p>
            <p className="panel-muted text-sm">
              {cliente?.edad} años
              {estaturaCm ? ` · ${estaturaCm} cm` : ''}
            </p>
          </div>
        </div>

        <div className="card-panel flex flex-col items-center justify-center gap-2 lg:col-span-1">
          {score?.valor != null ? (
            <ScoreGauge value={score.valor} delta={score.delta} />
          ) : (
            <p className="panel-muted text-sm">Sin score</p>
          )}
          <p className="panel-muted max-w-xs text-center text-xs">{score?.motivo}</p>
        </div>

        <div className="card-panel lg:col-span-1">
          <h2 className="panel-muted mb-3 text-xs uppercase tracking-wider">Resumen de peso</h2>
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="panel-muted text-[10px]">{fmtDate(comparison?.fechaAnterior)}</p>
              <p className="panel-text text-xl font-bold">
                {comparison?.pesoKg?.anterior != null
                  ? `${kgToLb(comparison.pesoKg.anterior)} LB`
                  : '—'}
              </p>
              <p className="panel-muted text-xs">
                {comparison?.pesoKg?.anterior != null ? `${comparison.pesoKg.anterior} kg` : ''}
              </p>
            </div>
            <div className="flex h-20 w-20 flex-col items-center justify-center rounded-full border-2 border-accent bg-accent/10 text-center text-xs font-bold text-accent">
              {comparison?.pesoKg?.cambio != null ? (
                <>
                  <span>{comparison.pesoKg.cambio < 0 ? '↓' : '↑'}</span>
                  <span>{Math.abs(kgToLb(Math.abs(comparison.pesoKg.cambio))).toFixed(1)} LB</span>
                </>
              ) : (
                <span>1ª</span>
              )}
            </div>
            <div className="text-right">
              <p className="panel-muted text-[10px]">{fmtDate(comparison?.fechaActual)}</p>
              <p className="panel-text text-xl font-bold">
                {comparison?.pesoKg?.actual != null ? `${kgToLb(comparison.pesoKg.actual)} LB` : '—'}
              </p>
              <p className="panel-muted text-xs">
                {comparison?.pesoKg?.actual != null ? `${comparison.pesoKg.actual} kg` : ''}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="card-panel overflow-x-auto">
          <h2 className="panel-text mb-3 font-display text-sm tracking-wider">MEDIDAS CORPORALES</h2>
          <table className="w-full min-w-[320px] text-sm">
            <thead>
              <tr className="panel-muted border-b border-[var(--cc-panel-border)] text-left text-[10px] uppercase">
                <th className="py-2">Medida</th>
                <th>{fmtDate(comparison?.fechaAnterior)}</th>
                <th>{fmtDate(comparison?.fechaActual)}</th>
                <th>Cambio</th>
              </tr>
            </thead>
            <tbody>
              {MEDIDA_ROWS.map(({ key, label }) => {
                const m = comparison?.medidas?.[key];
                return (
                  <tr key={key} className="border-b border-[var(--cc-panel-border)]/50">
                    <td className="py-2 panel-text">{label}</td>
                    <td>{m?.anterior ?? '—'}</td>
                    <td>{m?.actual ?? '—'}</td>
                    <td>
                      <DeltaText cambio={m?.cambio} unit="cm" />
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-accent/10 font-semibold">
                <td className="py-2 panel-text">Suma de medidas</td>
                <td>{comparison?.sumaMedidasCm?.anterior ?? '—'}</td>
                <td>{comparison?.sumaMedidasCm?.actual ?? '—'}</td>
                <td>
                  <DeltaText cambio={comparison?.sumaMedidasCm?.cambio} unit="cm" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="card-panel">
          <h2 className="panel-text mb-3 font-display text-sm tracking-wider">COMPARATIVO DE MEDIDAS (CM)</h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} layout="vertical" margin={{ left: 8, right: 8 }}>
                <XAxis type="number" stroke="#8aa0b8" fontSize={10} />
                <YAxis type="category" dataKey="name" width={72} stroke="#8aa0b8" fontSize={10} />
                <Tooltip
                  contentStyle={{ background: '#0B1220', border: '1px solid #176ea4', borderRadius: 8 }}
                />
                <Legend />
                <Bar dataKey="anterior" name="Anterior" fill="#64748b" radius={4} />
                <Bar dataKey="actual" name="Actual" fill="#0c83f4" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="panel-muted mt-2 text-right text-xs">
            Reducción total:{' '}
            <span className="font-semibold text-accent">
              {comparison?.resumenProgreso?.cmReducidos != null
                ? `${comparison.resumenProgreso.cmReducidos} cm`
                : '—'}
            </span>
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card-panel">
          <h2 className="panel-muted mb-2 text-xs uppercase tracking-wider">% Grasa corporal</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="panel-muted text-xs">Anterior</p>
              <p className="panel-text text-2xl font-bold">
                {comparison?.porcentajeGrasaCorporal?.anterior ?? '—'}%
              </p>
            </div>
            <DeltaText cambio={comparison?.porcentajeGrasaCorporal?.cambio} unit="pp" />
            <div className="text-right">
              <p className="panel-muted text-xs">Actual</p>
              <p className="panel-text text-2xl font-bold">
                {comparison?.porcentajeGrasaCorporal?.actual ?? '—'}%
              </p>
            </div>
          </div>
        </div>
        <div className="card-panel">
          <h2 className="panel-muted mb-2 text-xs uppercase tracking-wider">Masa muscular</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="panel-muted text-xs">Anterior</p>
              <p className="panel-text text-2xl font-bold">
                {comparison?.masaMuscularKg?.anterior ?? '—'} kg
              </p>
            </div>
            <DeltaText cambio={comparison?.masaMuscularKg?.cambio} unit="kg" goodWhenDown={false} />
            <div className="text-right">
              <p className="panel-muted text-xs">Actual</p>
              <p className="panel-text text-2xl font-bold">
                {comparison?.masaMuscularKg?.actual ?? '—'} kg
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card-panel">
          <h2 className="panel-text mb-3 font-display text-sm tracking-wider">RESUMEN DE PROGRESO</h2>
          <div className="h-40 w-full">
            {serie.length >= 2 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={serie}>
                  <XAxis
                    dataKey="fecha"
                    tickFormatter={(v) => new Date(v).toLocaleDateString('es-DO', { month: 'short' })}
                    stroke="#8aa0b8"
                    fontSize={10}
                  />
                  <YAxis stroke="#8aa0b8" fontSize={10} />
                  <Tooltip
                    contentStyle={{ background: '#0B1220', border: '1px solid #176ea4', borderRadius: 8 }}
                  />
                  <Line type="monotone" dataKey="peso" stroke="#0c83f4" strokeWidth={2} dot={false} />
                  <Line
                    type="monotone"
                    dataKey="grasaCorporalPct"
                    stroke="#22d3ee"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="masaMuscular"
                    stroke="#a78bfa"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="panel-muted text-sm">Se necesitan al menos 2 evaluaciones para la tendencia.</p>
            )}
          </div>
          <div className="mt-3 rounded-xl border border-accent/40 bg-accent/10 p-4">
            <p className="font-display text-sm tracking-wider text-accent">{celebracionMsg}</p>
            <p className="panel-muted mt-1 text-xs leading-relaxed">
              {score?.motivo || 'Disciplina, constancia y transformación.'}
            </p>
          </div>
        </div>

        <div className="card-panel">
          <h2 className="panel-text mb-3 font-display text-sm tracking-wider">
            PUNTOS A MEJORAR EN EL PRÓXIMO MES
          </h2>
          <ul className="space-y-2">
            {(comparison?.puntosAMejorar || []).length === 0 && (
              <li className="panel-muted text-sm">Sin puntos registrados en esta evaluación.</li>
            )}
            {(comparison?.puntosAMejorar || []).map((p: string) => (
              <li
                key={p}
                className="flex gap-2 rounded-lg border border-[var(--cc-panel-border)] bg-white/[0.03] px-3 py-2 text-sm panel-text"
              >
                <span className="text-accent">▸</span>
                {p}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <footer className="flex flex-col items-center justify-between gap-2 border-t border-[var(--cc-panel-border)] pt-4 sm:flex-row">
        <p className="panel-muted text-[10px] uppercase tracking-[0.2em]">
          Disciplina | Constancia | Transformación
        </p>
        <img src="/Canelalogo.webp" alt="Canela Coach" className="h-8 w-8 object-contain opacity-80" />
      </footer>
    </div>
  );
}
