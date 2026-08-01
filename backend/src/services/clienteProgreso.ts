import { calcularIMC, calcularDelta } from './calculos.js';
import { kgToLb } from './medidas.js';

type Num = number | null;

export type EvalProgresoLike = {
  _id?: unknown;
  fecha?: Date | string;
  tipo?: string;
  antropometria?: {
    peso?: number;
    estatura?: number;
    imc?: number;
    cintura?: number;
    sumaMedidasCm?: number;
  };
  composicionCorporal?: {
    grasaCorporalPct?: number;
    masaMuscular?: number;
    aguaCorporalPct?: number;
    grasaVisceral?: number;
  };
  resultadosCalculados?: {
    imc?: number;
    porcentajeGrasaCorporal?: number;
    masaMuscular?: number;
    metabolismoBasal?: number;
    pesoIdeal?: number;
    pesoObjetivo?: number;
  };
  scoreFisico?: { valor?: number; delta?: number; motivo?: string; celebracion?: boolean };
  weightLb?: number | null;
};

export type MetricaBalance = {
  actual: Num;
  anterior: Num;
  inicio: Num;
  deltaAnterior: Num;
  deltaInicio: Num;
  unidad: string;
  invertido: boolean;
};

function num(v: unknown): Num {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function pickPeso(e: EvalProgresoLike | null): Num {
  if (!e) return null;
  return num(e.antropometria?.peso);
}

function pickGrasa(e: EvalProgresoLike | null): Num {
  if (!e) return null;
  return num(e.composicionCorporal?.grasaCorporalPct) ?? num(e.resultadosCalculados?.porcentajeGrasaCorporal);
}

function pickMasa(e: EvalProgresoLike | null): Num {
  if (!e) return null;
  return num(e.composicionCorporal?.masaMuscular) ?? num(e.resultadosCalculados?.masaMuscular);
}

function pickImc(e: EvalProgresoLike | null): Num {
  if (!e) return null;
  const direct = num(e.antropometria?.imc) ?? num(e.resultadosCalculados?.imc);
  if (direct != null) return direct;
  const peso = pickPeso(e);
  const est = num(e.antropometria?.estatura);
  if (peso != null && est != null && est > 0) return calcularIMC(peso, est);
  return null;
}

function pickScore(e: EvalProgresoLike | null): Num {
  if (!e) return null;
  return num(e.scoreFisico?.valor);
}

function metrica(
  actual: Num,
  anterior: Num,
  inicio: Num,
  unidad: string,
  invertido: boolean
): MetricaBalance {
  return {
    actual,
    anterior,
    inicio,
    deltaAnterior: actual != null ? calcularDelta(actual, anterior) : null,
    deltaInicio: actual != null ? calcularDelta(actual, inicio) : null,
    unidad,
    invertido,
  };
}

function diasEntre(a?: Date | string, b?: Date | string): Num {
  if (!a || !b) return null;
  const t0 = new Date(a).getTime();
  const t1 = new Date(b).getTime();
  if (!Number.isFinite(t0) || !Number.isFinite(t1)) return null;
  return Math.max(0, Math.round(Math.abs(t1 - t0) / 86400000));
}

function tendenciaDe(balance: {
  peso: MetricaBalance;
  grasa: MetricaBalance;
  masa: MetricaBalance;
  score: MetricaBalance;
}): 'positivo' | 'neutral' | 'negativo' {
  let puntos = 0;
  let n = 0;
  const vote = (m: MetricaBalance) => {
    const d = m.deltaInicio ?? m.deltaAnterior;
    if (d == null || d === 0) return;
    n += 1;
    const bueno = m.invertido ? d < 0 : d > 0;
    puntos += bueno ? 1 : -1;
  };
  vote(balance.peso);
  vote(balance.grasa);
  vote(balance.masa);
  vote(balance.score);
  if (n === 0) return 'neutral';
  if (puntos > 0) return 'positivo';
  if (puntos < 0) return 'negativo';
  return 'neutral';
}

/**
 * Progreso individual del cliente: baseline → última vs penúltima.
 * `evaluacionesDesc` debe venir ordenada por fecha descendente (más reciente primero).
 */
export function buildClienteProgreso(evaluacionesDesc: EvalProgresoLike[]) {
  const activos = (evaluacionesDesc || []).filter(Boolean);
  const total = activos.length;
  const latest = activos[0] ?? null;
  const previous = activos[1] ?? null;
  const baseline = total > 0 ? activos[total - 1] : null;

  const peso = metrica(pickPeso(latest), pickPeso(previous), pickPeso(baseline), 'kg', true);
  const grasa = metrica(pickGrasa(latest), pickGrasa(previous), pickGrasa(baseline), '%', true);
  const masa = metrica(pickMasa(latest), pickMasa(previous), pickMasa(baseline), 'kg', false);
  const imc = metrica(pickImc(latest), pickImc(previous), pickImc(baseline), '', true);
  const score = metrica(pickScore(latest), pickScore(previous), pickScore(baseline), '%', false);

  const balance = { peso, grasa, masa, imc, score };
  const tendencia = tendenciaDe(balance);

  const pesoActual = peso.actual;
  const resumenParts: string[] = [];
  if (peso.deltaInicio != null && peso.deltaInicio !== 0) {
    const lb = +(Math.abs(peso.deltaInicio) * 2.20462).toFixed(1);
    resumenParts.push(
      peso.deltaInicio < 0 ? `${lb} lb menos desde el inicio` : `${lb} lb más desde el inicio`
    );
  }
  if (grasa.deltaInicio != null && grasa.deltaInicio !== 0) {
    resumenParts.push(
      grasa.deltaInicio < 0
        ? `${Math.abs(grasa.deltaInicio)}% grasa menos`
        : `${grasa.deltaInicio}% grasa más`
    );
  }
  if (masa.deltaInicio != null && masa.deltaInicio !== 0) {
    resumenParts.push(
      masa.deltaInicio > 0
        ? `+${masa.deltaInicio} kg músculo`
        : `${masa.deltaInicio} kg músculo`
    );
  }
  if (score.deltaInicio != null && score.deltaInicio !== 0) {
    resumenParts.push(
      score.deltaInicio > 0
        ? `score +${score.deltaInicio}`
        : `score ${score.deltaInicio}`
    );
  }

  const serieHistorica = [...activos]
    .reverse()
    .map((e) => ({
      fecha: e.fecha,
      peso: pickPeso(e),
      grasaCorporalPct: pickGrasa(e),
      masaMuscular: pickMasa(e),
      imc: pickImc(e),
      score: pickScore(e),
      weightLb: num(e.weightLb) ?? (pickPeso(e) != null ? kgToLb(pickPeso(e)!) : null),
    }));

  const ahora = new Date();
  const ultimaFecha = latest?.fecha ?? null;

  return {
    totalEvaluaciones: total,
    tieneProgreso: total >= 2,
    suficienteSerie: serieHistorica.filter((s) => s.peso != null).length >= 2,
    ultimaFecha,
    primeraFecha: baseline?.fecha ?? null,
    diasDesdeUltima: ultimaFecha ? diasEntre(ultimaFecha, ahora) : null,
    diasEntreUltimas: diasEntre(previous?.fecha, latest?.fecha),
    ultimaEvaluacionId: latest?._id ?? null,
    ultimaTipo: latest?.tipo ?? null,
    scoreActual: latest?.scoreFisico ?? null,
    pesoObjetivo: num(latest?.resultadosCalculados?.pesoObjetivo) ?? num(latest?.resultadosCalculados?.pesoIdeal),
    metabolismoBasal: num(latest?.resultadosCalculados?.metabolismoBasal),
    pesoActualLb: pesoActual != null ? kgToLb(pesoActual) : null,
    balance,
    tendencia,
    resumen:
      total === 0
        ? 'Sin evaluaciones. Registra la primera para iniciar el expediente de progreso.'
        : total === 1
          ? 'Primera evaluación registrada. La próxima permitirá medir el progreso real.'
          : resumenParts.length > 0
            ? resumenParts.join(' · ')
            : 'Métricas estables respecto al inicio. Continúa el seguimiento.',
    serieHistorica,
  };
}

/** Resumen ligero para listados de clientes (1 query agregada). */
export function resumenDesdeUltimaEval(
  count: number,
  latest: EvalProgresoLike | null | undefined
) {
  if (!latest) {
    return {
      totalEvaluaciones: count || 0,
      score: null as Num,
      pesoKg: null as Num,
      grasaPct: null as Num,
      ultimaFecha: null as Date | string | null,
    };
  }
  return {
    totalEvaluaciones: count,
    score: pickScore(latest),
    pesoKg: pickPeso(latest),
    grasaPct: pickGrasa(latest),
    ultimaFecha: latest.fecha ?? null,
  };
}
