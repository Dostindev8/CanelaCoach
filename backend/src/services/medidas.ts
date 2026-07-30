export const PUNTOS_A_MEJORAR_CATALOGO = [
  'Continuar reduciendo el % de grasa',
  'Seguir aumentando fuerza y masa muscular',
  'Mejorar cumplimiento de dieta y cardio',
  'Tomar suplementos recomendados',
  'Mejorar calidad del descanso',
  'Hidratación constante',
  'Manejo del estrés',
  'Seguimiento y disciplina',
] as const;

export type AntropometriaMedidas = {
  cuello?: number;
  torax?: number;
  biceps?: number;
  cintura?: number;
  gluteos?: number;
  cuadriceps?: number;
  pantorrilla?: number;
};

/** Recalcula suma de medidas corporales en cm — never trust client payload. */
export function calcularSumaMedidasCm(medidas?: AntropometriaMedidas | null): number | undefined {
  if (!medidas) return undefined;
  const keys: (keyof AntropometriaMedidas)[] = [
    'cuello',
    'torax',
    'biceps',
    'cintura',
    'gluteos',
    'cuadriceps',
    'pantorrilla',
  ];
  let sum = 0;
  let count = 0;
  for (const k of keys) {
    const v = medidas[k];
    if (typeof v === 'number' && Number.isFinite(v) && v > 0) {
      sum += v;
      count++;
    }
  }
  if (count === 0) return undefined;
  return +sum.toFixed(1);
}

export function kgToLb(kg: number): number {
  return +(kg * 2.20462).toFixed(1);
}

export function lbToKg(lb: number): number {
  return +(lb / 2.20462).toFixed(1);
}
