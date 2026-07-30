export function calcularIMC(pesoKg: number, estaturaM: number): number {
  if (!pesoKg || !estaturaM || estaturaM <= 0) return 0;
  return +(pesoKg / (estaturaM * estaturaM)).toFixed(1);
}

export function calcularDelta(valorActual: number, valorAnterior?: number | null): number | null {
  if (valorAnterior == null || Number.isNaN(valorAnterior)) return null;
  return +(valorActual - valorAnterior).toFixed(1);
}

export function calcularRatios(antropometria: {
  peso?: number;
  estatura?: number;
  cintura?: number;
  gluteos?: number;
}) {
  const result: { imc?: number; cinturaEstatura?: number; cinturaCadera?: number } = {};
  if (antropometria.peso && antropometria.estatura) {
    result.imc = calcularIMC(antropometria.peso, antropometria.estatura);
  }
  if (antropometria.cintura && antropometria.estatura) {
    result.cinturaEstatura = +(antropometria.cintura / (antropometria.estatura * 100)).toFixed(2);
  }
  if (antropometria.cintura && antropometria.gluteos) {
    result.cinturaCadera = +(antropometria.cintura / antropometria.gluteos).toFixed(2);
  }
  return result;
}

export interface SerieHistoricaItem {
  fecha: Date;
  peso?: number;
  grasaCorporalPct?: number;
  masaMuscular?: number;
}

export interface ReporteMensual {
  pesoInicial?: number;
  pesoActual?: number;
  cambioTotalPeso: number | null;
  grasaInicial?: number;
  grasaActual?: number;
  masaMuscularInicial?: number;
  masaMuscularActual?: number;
  serieHistorica: SerieHistoricaItem[];
  suficiente: boolean;
}

export function generarReporteMensualFromDocs(
  evaluaciones: Array<{
    fecha: Date;
    antropometria?: { peso?: number };
    composicionCorporal?: { grasaCorporalPct?: number; masaMuscular?: number };
  }>
): ReporteMensual {
  if (!evaluaciones.length) {
    return {
      cambioTotalPeso: null,
      serieHistorica: [],
      suficiente: false,
    };
  }

  const sorted = [...evaluaciones].sort(
    (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
  );
  const primera = sorted[0];
  const ultima = sorted[sorted.length - 1];

  return {
    pesoInicial: primera.antropometria?.peso,
    pesoActual: ultima.antropometria?.peso,
    cambioTotalPeso: calcularDelta(
      ultima.antropometria?.peso ?? 0,
      primera.antropometria?.peso
    ),
    grasaInicial: primera.composicionCorporal?.grasaCorporalPct,
    grasaActual: ultima.composicionCorporal?.grasaCorporalPct,
    masaMuscularInicial: primera.composicionCorporal?.masaMuscular,
    masaMuscularActual: ultima.composicionCorporal?.masaMuscular,
    serieHistorica: sorted.map((e) => ({
      fecha: e.fecha,
      peso: e.antropometria?.peso,
      grasaCorporalPct: e.composicionCorporal?.grasaCorporalPct,
      masaMuscular: e.composicionCorporal?.masaMuscular,
    })),
    suficiente: sorted.length >= 2,
  };
}

export function construirComparativa(
  actual: Record<string, unknown>,
  anterior: Record<string, unknown> | null
) {
  const campos = [
    'peso',
    'imc',
    'cuello',
    'torax',
    'biceps',
    'cintura',
    'gluteos',
    'cuadriceps',
    'pantorrilla',
    'sumaMedidasCm',
    'grasaCorporalPct',
    'masaMuscular',
    'aguaCorporalPct',
    'grasaVisceral',
  ] as const;

  const flat = (e: Record<string, unknown> | null) => {
    if (!e) return {} as Record<string, number>;
    const ant = (e.antropometria || {}) as Record<string, number>;
    const comp = (e.composicionCorporal || {}) as Record<string, number>;
    return { ...ant, ...comp };
  };

  const a = flat(actual);
  const b = flat(anterior);
  const deltas: Record<string, { actual: number | null; anterior: number | null; delta: number | null }> = {};

  for (const c of campos) {
    const av = typeof a[c] === 'number' ? a[c] : null;
    const bv = typeof b[c] === 'number' ? b[c] : null;
    deltas[c] = {
      actual: av,
      anterior: bv,
      delta: av != null ? calcularDelta(av, bv) : null,
    };
  }

  return {
    tieneAnterior: !!anterior,
    deltas,
    fechaActual: actual.fecha,
    fechaAnterior: anterior?.fecha ?? null,
    scoreFisico: (actual as { scoreFisico?: unknown }).scoreFisico ?? null,
  };
}
