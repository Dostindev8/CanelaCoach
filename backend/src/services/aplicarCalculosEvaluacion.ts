import type { ICliente } from '../models/Cliente.js';
import {
  calcularResultadosCompletos,
  type ObjetivoPaciente,
  type ResultadosCalculados,
} from './calculationsEngine.js';

function edadFromCliente(cliente: {
  edad?: number;
  fechaNacimiento?: Date | string | null;
}): number {
  if (cliente.fechaNacimiento) {
    const d = new Date(cliente.fechaNacimiento);
    if (!Number.isNaN(d.getTime())) {
      const now = new Date();
      let age = now.getFullYear() - d.getFullYear();
      const m = now.getMonth() - d.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
      if (age >= 1 && age <= 120) return age;
    }
  }
  return cliente.edad && cliente.edad > 0 ? cliente.edad : 30;
}

function mapObjetivo(raw?: string | null): ObjetivoPaciente {
  const s = (raw || '').toLowerCase();
  if (s.includes('grasa') || s.includes('perder') || s.includes('pérdida') || s.includes('bajar')) {
    return 'perder_grasa';
  }
  if (s.includes('músculo') || s.includes('muscul') || s.includes('ganar') || s.includes('ganancia')) {
    return 'ganar_musculo';
  }
  if (s.includes('mantener') || s.includes('manten')) return 'mantener';
  return 'otro';
}

export type EvalCalcPayload = {
  antropometria?: Record<string, number | string | undefined>;
  pliegues?: Record<string, number | undefined>;
  diametrosOseos?: Record<string, number | undefined>;
  composicionCorporal?: Record<string, number | undefined>;
  pesoObjetivoEditable?: number;
};

/**
 * Runs the pure calculations engine and merges results into antropometria + composicionCorporal.
 * Call on every create/update of Evaluacion.
 */
export function aplicarCalculosEvaluacion(
  data: EvalCalcPayload,
  cliente: Pick<ICliente, 'edad' | 'sexo' | 'objetivo' | 'fechaNacimiento'> & {
    objetivoPrincipal?: string;
  }
): {
  antropometria: EvalCalcPayload['antropometria'];
  composicionCorporal: EvalCalcPayload['composicionCorporal'];
  resultadosCalculados: ResultadosCalculados & { confianza: Record<string, string> };
  pesoObjetivoEditable?: number;
} {
  const ant = { ...(data.antropometria || {}) } as Record<string, number | undefined>;
  const peso = Number(ant.peso);
  let estatura = Number(ant.estatura);
  // Accept cm if someone sends 170 instead of 1.70
  if (estatura > 3) estatura = estatura / 100;

  if (!peso || !estatura) {
    return {
      antropometria: data.antropometria,
      composicionCorporal: data.composicionCorporal,
      resultadosCalculados: {
        imc: 0,
        disclaimers: [
          'Estimación basada en métodos antropométricos estándar — no constituye diagnóstico médico.',
          'Faltan peso o estatura para calcular resultados completos.',
        ],
        confianza: {},
      },
      pesoObjetivoEditable: data.pesoObjetivoEditable,
    };
  }

  const resultados = calcularResultadosCompletos({
    pesoKg: peso,
    estaturaM: estatura,
    edad: edadFromCliente(cliente),
    sexo: cliente.sexo,
    cinturaCm: ant.cintura != null ? Number(ant.cintura) : undefined,
    caderaCm: ant.cadera != null ? Number(ant.cadera) : undefined,
    gluteosCm: ant.gluteos != null ? Number(ant.gluteos) : undefined,
    bicepsCm:
      ant.biceps != null
        ? Number(ant.biceps)
        : ant.brazoDerecho != null
          ? Number(ant.brazoDerecho)
          : undefined,
    cuadricepsCm:
      ant.cuadriceps != null
        ? Number(ant.cuadriceps)
        : ant.musloDerecho != null
          ? Number(ant.musloDerecho)
          : undefined,
    pantorrillaCm: ant.pantorrilla != null ? Number(ant.pantorrilla) : undefined,
    pliegues: data.pliegues as Parameters<typeof calcularResultadosCompletos>[0]['pliegues'],
    diametros: data.diametrosOseos as Parameters<typeof calcularResultadosCompletos>[0]['diametros'],
    grasaPctManual:
      data.composicionCorporal?.grasaCorporalPct != null
        ? Number(data.composicionCorporal.grasaCorporalPct)
        : undefined,
    objetivo: mapObjetivo(cliente.objetivoPrincipal || cliente.objetivo),
    pesoObjetivoManual: data.pesoObjetivoEditable,
  });

  ant.imc = resultados.imc;
  ant.estatura = estatura;
  if (resultados.relacionCinturaCadera != null) {
    ant.cinturaCadera = resultados.relacionCinturaCadera;
  }

  const composicionCorporal = {
    ...(data.composicionCorporal || {}),
    grasaCorporalPct: resultados.porcentajeGrasaCorporal,
    masaMagra: resultados.masaLibreGrasa,
    masaMuscular: resultados.masaMuscular,
    aguaCorporalPct: resultados.aguaCorporal
      ? +((resultados.aguaCorporal / peso) * 100).toFixed(1)
      : data.composicionCorporal?.aguaCorporalPct,
    grasaVisceral: resultados.grasaVisceral,
    grasaCorporalLb:
      resultados.porcentajeGrasaCorporal != null
        ? +(((peso * resultados.porcentajeGrasaCorporal) / 100) * 2.20462).toFixed(1)
        : data.composicionCorporal?.grasaCorporalLb,
  };

  return {
    antropometria: ant,
    composicionCorporal,
    resultadosCalculados: resultados,
    pesoObjetivoEditable: data.pesoObjetivoEditable ?? resultados.pesoObjetivo,
  };
}
