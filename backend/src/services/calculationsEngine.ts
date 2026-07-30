/**
 * Pure anthropometric calculations engine — Canela Coach.
 * Units: weight kg, height meters (convert cm→m at call site if needed),
 * circumferences/skinfolds/diameters in cm / mm as documented per field.
 * These are industry-standard ESTIMATES, not clinical diagnoses.
 */

export type SexoCalc = 'Masculino' | 'Femenino' | 'male' | 'female';

export interface ConfianzaValor {
  valor: number;
  confianza: 'alta' | 'media' | 'estimacion';
  nota?: string;
}

function isMale(sexo: SexoCalc): boolean {
  const s = String(sexo).toLowerCase();
  return s.startsWith('m') || s === 'masculino' || s === 'male';
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/** IMC: peso(kg) / estatura(m)² */
export function calcularIMC(pesoKg: number, estaturaM: number): number {
  if (!pesoKg || !estaturaM || estaturaM <= 0) return 0;
  return +(pesoKg / (estaturaM * estaturaM)).toFixed(1);
}

export interface PlieguesMm {
  tricipital?: number;
  pectoral?: number;
  escapular?: number; // subescapular
  abdominal?: number;
  suprailiaco?: number;
  muslo?: number;
  pantorrilla?: number;
}

/**
 * Densidad corporal Jackson-Pollock 7 sitios (mm).
 * Hombres: D = 1.112 − 0.00043499×Σ7 + 0.00000055×(Σ7)² − 0.00028826×edad
 * Mujeres: D = 1.097 − 0.00046971×Σ7 + 0.00000056×(Σ7)² − 0.00012828×edad
 * Sitios: pecho, medioaxilar(≈escapular/subesc), tríceps, subescapular, abdomen, suprailiaco, muslo.
 * Usamos escapular como subescapular; medioaxilar aproximado con escapular si falta pecho.
 */
export function densidadJacksonPollock7(
  pliegues: PlieguesMm,
  edad: number,
  sexo: SexoCalc
): number | null {
  const sites = [
    pliegues.pectoral,
    pliegues.escapular,
    pliegues.tricipital,
    pliegues.escapular, // subescapular ≈ escapular if single measure
    pliegues.abdominal,
    pliegues.suprailiaco,
    pliegues.muslo,
  ];
  if (sites.some((v) => typeof v !== 'number' || v <= 0)) return null;
  // Use unique JP7: pectoral, midaxillary(proxy escapular), triceps, subscapular(escapular),
  // abdomen, suprailiac, thigh — sum once with distinct values available
  const sum = [
    pliegues.pectoral!,
    pliegues.escapular!,
    pliegues.tricipital!,
    pliegues.escapular!,
    pliegues.abdominal!,
    pliegues.suprailiaco!,
    pliegues.muslo!,
  ].reduce((a, b) => a + b, 0);

  const age = edad || 30;
  if (isMale(sexo)) {
    return +(1.112 - 0.00043499 * sum + 0.00000055 * sum * sum - 0.00028826 * age).toFixed(5);
  }
  return +(1.097 - 0.00046971 * sum + 0.00000056 * sum * sum - 0.00012828 * age).toFixed(5);
}

/** Siri: %Grasa = (495 / Densidad) − 450 */
export function porcentajeGrasaSiri(densidad: number): number {
  if (!densidad || densidad <= 0) return 0;
  return +((495 / densidad) - 450).toFixed(1);
}

export function porcentajeGrasaJacksonPollock(
  pliegues: PlieguesMm,
  edad: number,
  sexo: SexoCalc
): ConfianzaValor | null {
  const d = densidadJacksonPollock7(pliegues, edad, sexo);
  if (d == null) return null;
  return {
    valor: porcentajeGrasaSiri(d),
    confianza: 'alta',
    nota: 'Jackson-Pollock 7 sitios + Siri (estimación antropométrica)',
  };
}

/** Masa libre de grasa = peso × (1 − %grasa/100) */
export function masaLibreGrasa(pesoKg: number, grasaPct: number): number {
  return +(pesoKg * (1 - grasaPct / 100)).toFixed(1);
}

/**
 * Masa muscular estimada (Lee et al. 2000 anthropometric):
 * Hombres: Ht×(0.00744×CAG² + 0.00088×CTG² + 0.00441×CCG²) + 2.4×sexo − 0.048×edad + raza + 7.8
 * Simplified using corrected arm/thigh/calf girths when pliegues available;
 * fallback: MLG × 0.52 (approx skeletal muscle fraction).
 */
export function masaMuscularEstimada(opts: {
  pesoKg: number;
  grasaPct: number;
  estaturaM: number;
  edad: number;
  sexo: SexoCalc;
  circunferencias?: { biceps?: number; cuadriceps?: number; pantorrilla?: number };
  pliegues?: PlieguesMm;
}): ConfianzaValor {
  const mlg = masaLibreGrasa(opts.pesoKg, opts.grasaPct);
  const circ = opts.circunferencias || {};
  const pl = opts.pliegues || {};
  if (circ.biceps && circ.cuadriceps && circ.pantorrilla && opts.estaturaM > 0) {
    // Corrected girths (cm) ≈ circumference − π×(skinfold_mm/10)
    const cag = circ.biceps - Math.PI * ((pl.tricipital || 10) / 10);
    const ctg = circ.cuadriceps - Math.PI * ((pl.muslo || 12) / 10);
    const ccg = circ.pantorrilla - Math.PI * ((pl.pantorrilla || 8) / 10);
    const sex = isMale(opts.sexo) ? 1 : 0;
    const htCm = opts.estaturaM * 100;
    const sm =
      htCm * (0.00744 * cag * cag + 0.00088 * ctg * ctg + 0.00441 * ccg * ccg) +
      2.4 * sex -
      0.048 * opts.edad +
      7.8;
    return {
      valor: +clamp(sm, 10, opts.pesoKg * 0.7).toFixed(1),
      confianza: 'media',
      nota: 'Lee et al. antropométrica (estimación)',
    };
  }
  return {
    valor: +(mlg * 0.52).toFixed(1),
    confianza: 'estimacion',
    nota: 'Fracción aproximada de MLG (sin circunferencias completas)',
  };
}

/**
 * Masa ósea Von Döbeln:
 * masa_osea(kg) = 3.02 × (H² × R × F × 400)^(0.712)
 * donde H=estatura(m), R=diámetro radio/muñeca(m), F=diámetro fémur/rodilla(m).
 * Aproximamos muñeca y rodilla; si falta codo se omite del producto con media.
 */
export function masaOseaVonDobeln(opts: {
  estaturaM: number;
  diametros?: { codo?: number; rodilla?: number; muneca?: number };
}): ConfianzaValor | null {
  const d = opts.diametros || {};
  if (!opts.estaturaM || (!d.muneca && !d.rodilla)) return null;
  const H = opts.estaturaM;
  const R = (d.muneca || d.codo || 5.5) / 100; // cm → m
  const F = (d.rodilla || 9) / 100;
  const masa = 3.02 * Math.pow(H * H * R * F * 400, 0.712);
  return {
    valor: +clamp(masa, 1.5, 8).toFixed(2),
    confianza: 'media',
    nota: 'Von Döbeln (estimación con diámetros óseos)',
  };
}

/** Agua corporal Watson (litros ≈ kg): diferenciada por sexo */
export function aguaCorporalWatson(opts: {
  pesoKg: number;
  estaturaM: number;
  edad: number;
  sexo: SexoCalc;
}): ConfianzaValor {
  const htCm = opts.estaturaM * 100;
  let litros: number;
  if (isMale(opts.sexo)) {
    litros = 2.447 - 0.09516 * opts.edad + 0.1074 * htCm + 0.3362 * opts.pesoKg;
  } else {
    litros = -2.097 + 0.1069 * htCm + 0.2466 * opts.pesoKg;
  }
  const pct = +((litros / opts.pesoKg) * 100).toFixed(1);
  return {
    valor: pct,
    confianza: 'media',
    nota: 'Watson TBW → % del peso (estimación)',
  };
}

/**
 * Grasa visceral — estimación antropométrica (NO bioimpedancia).
 * Score relativo 1–12 basado en cintura + IMC.
 */
export function grasaVisceralEstimada(opts: {
  cinturaCm?: number;
  imc?: number;
  sexo: SexoCalc;
}): ConfianzaValor | null {
  if (!opts.cinturaCm || !opts.imc) return null;
  const male = isMale(opts.sexo);
  const waistRisk = male ? opts.cinturaCm - 90 : opts.cinturaCm - 80;
  const imcRisk = opts.imc - 25;
  let score = 5 + waistRisk * 0.15 + imcRisk * 0.25;
  score = clamp(Math.round(score), 1, 12);
  return {
    valor: score,
    confianza: 'estimacion',
    nota: 'Estimación antropométrica (cintura+IMC), no medición clínica',
  };
}

/** Mifflin-St Jeor BMR (kcal/día). estatura en cm para la fórmula. */
export function metabolismoBasalMifflin(opts: {
  pesoKg: number;
  estaturaM: number;
  edad: number;
  sexo: SexoCalc;
}): number {
  const htCm = opts.estaturaM * 100;
  if (isMale(opts.sexo)) {
    return Math.round(10 * opts.pesoKg + 6.25 * htCm - 5 * opts.edad + 5);
  }
  return Math.round(10 * opts.pesoKg + 6.25 * htCm - 5 * opts.edad - 161);
}

/** Relación cintura/cadera */
export function relacionCinturaCadera(cinturaCm: number, caderaCm: number): number | null {
  if (!cinturaCm || !caderaCm || caderaCm <= 0) return null;
  return +(cinturaCm / caderaCm).toFixed(2);
}

/** Devine ideal weight — already returns kg (not lb). estatura en metros. */
export function pesoIdealDevine(estaturaM: number, sexo: SexoCalc): { idealKg: number; rangoImcSaludable: { min: number; max: number } } {
  const inches = estaturaM * 39.3701;
  const base = isMale(sexo) ? 50 : 45.5;
  const idealKg = +(base + 2.3 * Math.max(0, inches - 60)).toFixed(1);
  return {
    idealKg,
    rangoImcSaludable: {
      min: +(18.5 * estaturaM * estaturaM).toFixed(1),
      max: +(24.9 * estaturaM * estaturaM).toFixed(1),
    },
  };
}

export type ObjetivoPaciente =
  | 'pérdida de grasa'
  | 'ganancia muscular'
  | 'tonificación'
  | 'salud general'
  | 'mantener'
  | string
  | undefined;

/** Peso objetivo sugerido (coach puede sobrescribir). */
export function pesoObjetivoSugerido(opts: {
  pesoActualKg: number;
  pesoIdealKg: number;
  grasaPct?: number;
  objetivo?: ObjetivoPaciente;
}): number {
  const o = (opts.objetivo || '').toLowerCase();
  if (o.includes('grasa') || o.includes('pérdida') || o.includes('perdida') || o.includes('peso')) {
    const target = Math.min(opts.pesoActualKg, (opts.pesoIdealKg + opts.pesoActualKg) / 2);
    return +Math.max(opts.pesoIdealKg * 0.95, target - Math.min(5, opts.pesoActualKg * 0.05)).toFixed(1);
  }
  if (o.includes('músculo') || o.includes('musculo') || o.includes('fuerza')) {
    return +(opts.pesoActualKg + 1.5).toFixed(1);
  }
  if (o.includes('mantener')) return +opts.pesoActualKg.toFixed(1);
  return +((opts.pesoIdealKg + opts.pesoActualKg) / 2).toFixed(1);
}

export interface ResultadosCalculadosInput {
  pesoKg: number;
  estaturaM: number;
  edad: number;
  sexo: SexoCalc;
  cinturaCm?: number;
  caderaCm?: number; // gluteos often used as proxy
  gluteosCm?: number;
  bicepsCm?: number;
  cuadricepsCm?: number;
  pantorrillaCm?: number;
  pliegues?: PlieguesMm;
  diametros?: { codo?: number; rodilla?: number; muneca?: number };
  grasaPctManual?: number;
  objetivo?: ObjetivoPaciente;
  pesoObjetivoManual?: number;
}

export interface ResultadosCalculados {
  imc: number;
  porcentajeGrasaCorporal?: number;
  masaMuscular?: number;
  masaLibreGrasa?: number;
  masaOsea?: number;
  aguaCorporal?: number;
  grasaVisceral?: number;
  metabolismoBasal?: number;
  relacionCinturaCadera?: number | null;
  pesoIdeal?: number;
  pesoIdealRangoImc?: { min: number; max: number };
  pesoObjetivo?: number;
  disclaimers: string[];
  confianza: Record<string, string>;
}

/** Orchestrates all calculations for one evaluation save. */
export function calcularResultadosCompletos(input: ResultadosCalculadosInput): ResultadosCalculados {
  const disclaimers = [
    'Estimación basada en métodos antropométricos estándar — no constituye diagnóstico médico.',
  ];
  const confianza: Record<string, string> = {};

  const imc = calcularIMC(input.pesoKg, input.estaturaM);
  let grasaPct = input.grasaPctManual;
  if (input.pliegues) {
    const jp = porcentajeGrasaJacksonPollock(input.pliegues, input.edad, input.sexo);
    if (jp) {
      grasaPct = jp.valor;
      confianza.porcentajeGrasaCorporal = jp.confianza;
      if (jp.nota) disclaimers.push(jp.nota);
    }
  }
  if (grasaPct == null) {
    // fallback rough from IMC if no data
    grasaPct = isMale(input.sexo)
      ? +(1.2 * imc + 0.23 * input.edad - 16.2).toFixed(1)
      : +(1.2 * imc + 0.23 * input.edad - 5.4).toFixed(1);
    confianza.porcentajeGrasaCorporal = 'estimacion';
    disclaimers.push(' % grasa estimado por IMC (sin pliegues ni medición directa).');
  }

  const mlg = masaLibreGrasa(input.pesoKg, grasaPct);
  const musc = masaMuscularEstimada({
    pesoKg: input.pesoKg,
    grasaPct,
    estaturaM: input.estaturaM,
    edad: input.edad,
    sexo: input.sexo,
    circunferencias: {
      biceps: input.bicepsCm,
      cuadriceps: input.cuadricepsCm,
      pantorrilla: input.pantorrillaCm,
    },
    pliegues: input.pliegues,
  });
  confianza.masaMuscular = musc.confianza;

  const osea = masaOseaVonDobeln({
    estaturaM: input.estaturaM,
    diametros: input.diametros,
  });
  if (osea) {
    confianza.masaOsea = osea.confianza;
  }

  const agua = aguaCorporalWatson({
    pesoKg: input.pesoKg,
    estaturaM: input.estaturaM,
    edad: input.edad,
    sexo: input.sexo,
  });
  confianza.aguaCorporal = agua.confianza;

  const visceral = grasaVisceralEstimada({
    cinturaCm: input.cinturaCm,
    imc,
    sexo: input.sexo,
  });
  if (visceral) {
    confianza.grasaVisceral = visceral.confianza;
    if (visceral.nota) disclaimers.push(visceral.nota);
  }

  const bmr = metabolismoBasalMifflin({
    pesoKg: input.pesoKg,
    estaturaM: input.estaturaM,
    edad: input.edad,
    sexo: input.sexo,
  });

  const cadera = input.caderaCm || input.gluteosCm;
  const rcc =
    input.cinturaCm && cadera ? relacionCinturaCadera(input.cinturaCm, cadera) : null;

  const ideal = pesoIdealDevine(input.estaturaM, input.sexo);
  const pesoObjetivo =
    typeof input.pesoObjetivoManual === 'number'
      ? input.pesoObjetivoManual
      : pesoObjetivoSugerido({
          pesoActualKg: input.pesoKg,
          pesoIdealKg: ideal.idealKg,
          grasaPct,
          objetivo: input.objetivo,
        });

  return {
    imc,
    porcentajeGrasaCorporal: grasaPct,
    masaMuscular: musc.valor,
    masaLibreGrasa: mlg,
    masaOsea: osea?.valor,
    aguaCorporal: agua.valor,
    grasaVisceral: visceral?.valor,
    metabolismoBasal: bmr,
    relacionCinturaCadera: rcc,
    pesoIdeal: ideal.idealKg,
    pesoIdealRangoImc: ideal.rangoImcSaludable,
    pesoObjetivo,
    disclaimers: [...new Set(disclaimers)],
    confianza,
  };
}
