import { ScoreGauge } from '../ui/ScoreGauge';
import { TarjetaComparativa } from '../ui/TarjetaComparativa';
import { StatCard } from '../ui/StatCard';
import { GraficaEvolucion } from '../ui/GraficaEvolucion';
import { Link } from 'react-router-dom';

export type MetricaBalance = {
  actual: number | null;
  anterior: number | null;
  inicio: number | null;
  deltaAnterior: number | null;
  deltaInicio: number | null;
  unidad: string;
  invertido: boolean;
};

export type ClienteProgreso = {
  totalEvaluaciones: number;
  tieneProgreso: boolean;
  suficienteSerie: boolean;
  ultimaFecha: string | Date | null;
  primeraFecha: string | Date | null;
  diasDesdeUltima: number | null;
  diasEntreUltimas: number | null;
  ultimaEvaluacionId: string | null;
  ultimaTipo: string | null;
  scoreActual?: { valor?: number; delta?: number; motivo?: string } | null;
  pesoObjetivo: number | null;
  metabolismoBasal: number | null;
  pesoActualLb: number | null;
  balance: {
    peso: MetricaBalance;
    grasa: MetricaBalance;
    masa: MetricaBalance;
    imc: MetricaBalance;
    score: MetricaBalance;
  };
  tendencia: 'positivo' | 'neutral' | 'negativo';
  resumen: string;
  serieHistorica: Array<{
    fecha?: string | Date;
    peso?: number | null;
    grasaCorporalPct?: number | null;
    masaMuscular?: number | null;
  }>;
};

interface Props {
  clienteId: string;
  progreso: ClienteProgreso;
  loading?: boolean;
}

function tendenciaLabel(t: ClienteProgreso['tendencia']) {
  if (t === 'positivo') return { text: 'Tendencia positiva', className: 'panel-positive' };
  if (t === 'negativo') return { text: 'Requiere atención', className: 'panel-negative' };
  return { text: 'Estable', className: 'panel-muted' };
}

function fmtDelta(d: number | null | undefined, unidad = '') {
  if (d == null) return '—';
  const sign = d > 0 ? '+' : '';
  return `${sign}${d}${unidad}`;
}

export function ClienteProgresoPanel({ clienteId, progreso, loading }: Props) {
  if (loading) {
    return <div className="h-64 animate-pulse rounded-2xl bg-silver/20" aria-busy="true" />;
  }

  const { balance, scoreActual } = progreso;
  const tend = tendenciaLabel(progreso.tendencia);
  const scoreValor = scoreActual?.valor ?? balance.score.actual;

  return (
    <section className="space-y-6" aria-labelledby="progreso-heading">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="progreso-heading" className="panel-text font-display text-lg tracking-wider">
            MÉTRICAS Y PROGRESO
          </h2>
          <p className="panel-muted mt-1 max-w-2xl text-sm">{progreso.resumen}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-sm font-semibold ${tend.className}`}>{tend.text}</span>
          <Link to={`/clientes/${clienteId}/evaluacion/nueva`} className="btn-primary text-sm">
            Nueva evaluación
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Evaluaciones"
          value={progreso.totalEvaluaciones}
          footer={
            progreso.ultimaFecha
              ? `Última: ${new Date(progreso.ultimaFecha).toLocaleDateString('es-DO')}`
              : 'Sin evaluaciones'
          }
        />
        <StatCard
          label="Días desde última"
          value={progreso.diasDesdeUltima ?? '—'}
          footer={
            progreso.diasEntreUltimas != null
              ? `${progreso.diasEntreUltimas} días entre las 2 últimas`
              : 'Programa la siguiente revisión'
          }
        />
        <StatCard
          label="Peso actual"
          value={balance.peso.actual ?? '—'}
          unit={balance.peso.actual != null ? 'kg' : undefined}
          footer={
            progreso.pesoActualLb != null
              ? `${progreso.pesoActualLb} lb${
                  progreso.pesoObjetivo != null ? ` · objetivo ${progreso.pesoObjetivo} kg` : ''
                }`
              : progreso.pesoObjetivo != null
                ? `Objetivo ${progreso.pesoObjetivo} kg`
                : 'Registra antropometría'
          }
        />
        <StatCard
          label="Metabolismo"
          value={progreso.metabolismoBasal ?? '—'}
          unit={progreso.metabolismoBasal != null ? 'kcal' : undefined}
          footer="Basal estimado (última eval.)"
        />
      </div>

      {(scoreValor != null || progreso.totalEvaluaciones > 0) && (
        <div className="card-panel flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="panel-muted text-xs uppercase tracking-wider">Score físico individual</p>
            <p className="panel-text mt-1 font-display text-2xl tracking-wide">
              {scoreValor != null ? `${scoreValor}%` : 'Pendiente'}
            </p>
            {scoreActual?.motivo && (
              <p className="panel-muted mt-2 max-w-lg text-sm">{scoreActual.motivo}</p>
            )}
            <div className="mt-3 flex flex-wrap gap-4 text-sm">
              <span className="panel-muted">
                vs anterior:{' '}
                <strong className="panel-text">{fmtDelta(balance.score.deltaAnterior)}</strong>
              </span>
              <span className="panel-muted">
                vs inicio:{' '}
                <strong className="panel-text">{fmtDelta(balance.score.deltaInicio)}</strong>
              </span>
            </div>
          </div>
          {scoreValor != null && (
            <ScoreGauge
              value={scoreValor}
              delta={scoreActual?.delta ?? balance.score.deltaAnterior ?? undefined}
              size={110}
            />
          )}
        </div>
      )}

      <div>
        <h3 className="panel-muted mb-3 text-xs font-semibold uppercase tracking-wider">
          Balance corporal (actual vs anterior)
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <TarjetaComparativa
            label="Peso"
            actual={balance.peso.actual}
            anterior={balance.peso.anterior}
            delta={balance.peso.deltaAnterior}
            unidad="kg"
            invertido
          />
          <TarjetaComparativa
            label="% Grasa"
            actual={balance.grasa.actual}
            anterior={balance.grasa.anterior}
            delta={balance.grasa.deltaAnterior}
            unidad="%"
            invertido
          />
          <TarjetaComparativa
            label="Masa muscular"
            actual={balance.masa.actual}
            anterior={balance.masa.anterior}
            delta={balance.masa.deltaAnterior}
            unidad="kg"
          />
          <TarjetaComparativa
            label="IMC"
            actual={balance.imc.actual}
            anterior={balance.imc.anterior}
            delta={balance.imc.deltaAnterior}
            invertido
          />
        </div>
      </div>

      {progreso.tieneProgreso && (
        <div className="card-panel">
          <h3 className="panel-text mb-3 font-display text-base tracking-wider">
            PROGRESO ADQUIRIDO (DESDE INICIO)
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(
              [
                ['Peso', balance.peso],
                ['Grasa', balance.grasa],
                ['Músculo', balance.masa],
                ['Score', balance.score],
              ] as const
            ).map(([label, m]) => {
              const d = m.deltaInicio;
              const bueno =
                d != null && d !== 0 ? (m.invertido ? d < 0 : d > 0) : null;
              const color =
                bueno === true ? 'panel-positive' : bueno === false ? 'panel-negative' : 'panel-muted';
              return (
                <div key={label} className="rounded-xl border border-[var(--cc-panel-border)] p-3">
                  <p className="panel-muted text-xs uppercase tracking-wider">{label}</p>
                  <p className={`mt-1 font-display text-2xl font-bold ${color}`}>
                    {d == null ? '—' : `${d > 0 ? '+' : ''}${d}${m.unidad}`}
                  </p>
                  <p className="panel-muted mt-1 text-xs">
                    Inicio {m.inicio ?? '—'} → Actual {m.actual ?? '—'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <GraficaEvolucion
        data={progreso.serieHistorica
          .filter((s): s is typeof s & { fecha: string | Date } => s.fecha != null)
          .map((s) => ({
            fecha: s.fecha,
            peso: s.peso ?? undefined,
            grasaCorporalPct: s.grasaCorporalPct ?? undefined,
            masaMuscular: s.masaMuscular ?? undefined,
          }))}
        suficiente={progreso.suficienteSerie}
        loading={false}
      />

      {progreso.totalEvaluaciones === 0 && (
        <div className="card-panel flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="panel-muted text-sm">
            Este cliente aún no tiene evaluaciones. El progreso individual se calcula a partir de cada
            evaluación registrada.
          </p>
          <Link to={`/clientes/${clienteId}/evaluacion/nueva`} className="btn-primary shrink-0">
            Registrar primera evaluación
          </Link>
        </div>
      )}
    </section>
  );
}
