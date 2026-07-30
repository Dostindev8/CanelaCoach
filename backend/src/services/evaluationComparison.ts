import { calcularDelta, calcularIMC } from './calculos.js';
import { calcularSumaMedidasCm, kgToLb } from './medidas.js';

export type DireccionCambio = 'baja' | 'sube' | 'igual' | null;

export interface MetricaDelta {
  anterior: number | null;
  actual: number | null;
  cambio: number | null;
  direccion: DireccionCambio;
  actualLb?: number | null;
  anteriorLb?: number | null;
}

function direccionDe(cambio: number | null): DireccionCambio {
  if (cambio == null) return null;
  if (cambio < 0) return 'baja';
  if (cambio > 0) return 'sube';
  return 'igual';
}

function metrica(actual: number | null | undefined, anterior: number | null | undefined): MetricaDelta {
  const a = typeof actual === 'number' && Number.isFinite(actual) ? actual : null;
  const b = typeof anterior === 'number' && Number.isFinite(anterior) ? anterior : null;
  const cambio = a != null ? calcularDelta(a, b) : null;
  return { anterior: b, actual: a, cambio, direccion: direccionDe(cambio) };
}

type EvalLike = {
  fecha?: Date | string;
  antropometria?: Record<string, number | undefined>;
  composicionCorporal?: Record<string, number | undefined>;
  scoreFisico?: { valor?: number; delta?: number; celebracion?: boolean; motivo?: string };
  puntosAMejorar?: string[];
  notasEntrenador?: string;
};

const MEDIDA_KEYS = [
  'cuello',
  'torax',
  'biceps',
  'cintura',
  'gluteos',
  'cuadriceps',
  'pantorrilla',
] as const;

/**
 * Full comparison between two evaluations (or first-eval empty anterior).
 * Backend returns numeric deltas only — frontend decides visual semantics.
 */
export function compareEvaluations(anterior: EvalLike | null, actual: EvalLike) {
  const antA = actual.antropometria || {};
  const antB = anterior?.antropometria || {};
  const compA = actual.composicionCorporal || {};
  const compB = anterior?.composicionCorporal || {};

  const sumaActual = antA.sumaMedidasCm ?? calcularSumaMedidasCm(antA);
  const sumaAnterior = anterior
    ? antB.sumaMedidasCm ?? calcularSumaMedidasCm(antB)
    : null;

  const peso = metrica(antA.peso, antB.peso);
  if (peso.actual != null) peso.actualLb = kgToLb(peso.actual);
  if (peso.anterior != null) peso.anteriorLb = kgToLb(peso.anterior);

  const medidas: Record<string, MetricaDelta> = {};
  for (const k of MEDIDA_KEYS) {
    medidas[`${k}Cm`] = metrica(antA[k], antB[k]);
  }

  const sumaMedidasCm = metrica(sumaActual ?? null, sumaAnterior);
  const porcentajeGrasaCorporal = metrica(compA.grasaCorporalPct, compB.grasaCorporalPct);
  const masaMuscularKg = metrica(compA.masaMuscular, compB.masaMuscular);

  let diasEntreEvaluaciones: number | null = null;
  if (anterior?.fecha && actual.fecha) {
    const t0 = new Date(anterior.fecha).getTime();
    const t1 = new Date(actual.fecha).getTime();
    diasEntreEvaluaciones = Math.max(0, Math.round((t1 - t0) / 86400000));
  }

  const resumenProgreso = {
    pesoPerdidoLb:
      peso.cambio != null ? +(-(peso.cambio) * 2.20462).toFixed(1) : null,
    pesoCambioKg: peso.cambio,
    cmReducidos: sumaMedidasCm.cambio != null ? +(-sumaMedidasCm.cambio).toFixed(1) : null,
    puntosGrasaReducidos:
      porcentajeGrasaCorporal.cambio != null
        ? +(-porcentajeGrasaCorporal.cambio).toFixed(1)
        : null,
    kgMusculoGanado: masaMuscularKg.cambio,
  };

  return {
    tieneAnterior: !!anterior,
    pesoLb: peso,
    pesoKg: metrica(antA.peso, antB.peso),
    estaturaCm: metrica(antA.estatura, antB.estatura),
    imc: metrica(antA.imc ?? (antA.peso && antA.estatura ? calcularIMC(antA.peso, antA.estatura) : null), antB.imc),
    medidas,
    sumaMedidasCm,
    porcentajeGrasaCorporal,
    masaMuscularKg,
    diasEntreEvaluaciones,
    resumenProgreso,
    scoreFisico: actual.scoreFisico || null,
    puntosAMejorar: actual.puntosAMejorar || [],
    notasEntrenador: actual.notasEntrenador || null,
    fechaActual: actual.fecha ?? null,
    fechaAnterior: anterior?.fecha ?? null,
  };
}
