import { calcularSumaMedidasCm, type AntropometriaMedidas } from './medidas.js';

export type ObjetivoScore =
  | 'pérdida de grasa'
  | 'ganancia muscular'
  | 'tonificación'
  | 'salud general'
  | 'preparación deportiva'
  | 'otro'
  | string
  | undefined;

export interface ScoreEvalSnapshot {
  antropometria?: AntropometriaMedidas & { peso?: number; sumaMedidasCm?: number };
  composicionCorporal?: {
    grasaCorporalPct?: number;
    masaMuscular?: number;
  };
  scoreFisico?: { valor?: number };
}

export interface ScoreFisicoResult {
  valor: number;
  delta: number;
  celebracion: boolean;
  motivo: string;
  metricasMejoradas: number;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function isFatLossGoal(objetivo?: ObjetivoScore): boolean {
  if (!objetivo) return true;
  const o = objetivo.toLowerCase();
  return (
    o.includes('grasa') ||
    o.includes('pérdida') ||
    o.includes('perdida') ||
    o.includes('peso') ||
    o.includes('tonific') ||
    o.includes('salud')
  );
}

function isMuscleGainGoal(objetivo?: ObjetivoScore): boolean {
  if (!objetivo) return false;
  const o = objetivo.toLowerCase();
  return o.includes('músculo') || o.includes('musculo') || o.includes('fuerza') || o.includes('deportiv');
}

/**
 * Physical score 0–100. First evaluation baselines at 50.
 * Improves when metrics move in the expected direction for the client's goal.
 */
export function calcularScoreFisico(
  actual: ScoreEvalSnapshot,
  anterior: ScoreEvalSnapshot | null,
  objetivo?: ObjetivoScore
): ScoreFisicoResult {
  const baseline = anterior?.scoreFisico?.valor ?? 50;

  if (!anterior) {
    return {
      valor: 50,
      delta: 0,
      celebracion: false,
      motivo: 'Primera evaluación — score base 50%. La próxima comparación ajustará tu nivel.',
      metricasMejoradas: 0,
    };
  }

  const fatLoss = isFatLossGoal(objetivo);
  const muscleGain = isMuscleGainGoal(objetivo);

  let puntos = 0;
  let mejoradas = 0;
  let empeoradas = 0;

  const pesoA = actual.antropometria?.peso;
  const pesoB = anterior.antropometria?.peso;
  if (typeof pesoA === 'number' && typeof pesoB === 'number') {
    const d = pesoA - pesoB;
    if (fatLoss && !muscleGain) {
      if (d < -0.2) {
        puntos += Math.min(8, Math.abs(d) * 2);
        mejoradas++;
      } else if (d > 0.3) {
        puntos -= Math.min(8, d * 2);
        empeoradas++;
      }
    } else if (muscleGain && !fatLoss) {
      if (d > 0.2) {
        puntos += Math.min(6, d * 1.5);
        mejoradas++;
      } else if (d < -0.5) {
        puntos -= Math.min(6, Math.abs(d) * 1.5);
        empeoradas++;
      }
    } else {
      // Mixed / general: slight weight loss preferred for body recomp
      if (d < -0.2) {
        puntos += Math.min(5, Math.abs(d) * 1.5);
        mejoradas++;
      } else if (d > 0.5) {
        puntos -= Math.min(5, d);
        empeoradas++;
      }
    }
  }

  const sumaA =
    actual.antropometria?.sumaMedidasCm ??
    calcularSumaMedidasCm(actual.antropometria);
  const sumaB =
    anterior.antropometria?.sumaMedidasCm ??
    calcularSumaMedidasCm(anterior.antropometria);
  if (typeof sumaA === 'number' && typeof sumaB === 'number') {
    const d = sumaA - sumaB;
    if (d < -0.5) {
      puntos += Math.min(10, Math.abs(d) * 0.4);
      mejoradas++;
    } else if (d > 1) {
      puntos -= Math.min(10, d * 0.35);
      empeoradas++;
    }
  }

  const grasaA = actual.composicionCorporal?.grasaCorporalPct;
  const grasaB = anterior.composicionCorporal?.grasaCorporalPct;
  if (typeof grasaA === 'number' && typeof grasaB === 'number') {
    const d = grasaA - grasaB;
    if (d < -0.1) {
      puntos += Math.min(10, Math.abs(d) * 4);
      mejoradas++;
    } else if (d > 0.2) {
      puntos -= Math.min(10, d * 4);
      empeoradas++;
    }
  }

  const muscA = actual.composicionCorporal?.masaMuscular;
  const muscB = anterior.composicionCorporal?.masaMuscular;
  if (typeof muscA === 'number' && typeof muscB === 'number') {
    const d = muscA - muscB;
    if (d > 0.1) {
      puntos += Math.min(10, d * 5);
      mejoradas++;
    } else if (d < -0.3) {
      puntos -= Math.min(10, Math.abs(d) * 4);
      empeoradas++;
    }
  }

  const valor = Math.round(clamp(baseline + puntos, 0, 100));
  const delta = valor - baseline;
  const celebracion = delta >= 3 && mejoradas >= 2;

  let motivo: string;
  if (celebracion) {
    motivo = `¡Excelente progreso! Tu score subió ${delta} puntos (${valor}%). Sigue así.`;
  } else if (delta >= 1) {
    motivo = `Buen avance: score ${valor}% (+${delta}). Mantén la constancia.`;
  } else if (delta <= -3 || empeoradas >= 2) {
    motivo =
      `Ajuste necesario: score ${valor}% (${delta}). Revisemos hábitos, dieta y entrenamiento el próximo mes.`;
  } else if (delta < 0) {
    motivo = `Score ${valor}% (${delta}). Estás cerca — afinemos el plan.`;
  } else {
    motivo = `Score estable en ${valor}%. Sigue trabajando con disciplina.`;
  }

  return { valor, delta, celebracion, motivo, metricasMejoradas: mejoradas };
}
