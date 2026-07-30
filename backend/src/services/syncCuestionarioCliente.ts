import type { ICliente } from '../models/Cliente.js';
import type { ICuestionarioIngreso } from '../models/CuestionarioIngreso.js';
import { descifrarAntecedentes } from '../utils/campoCifrado.js';

const NIVEL_MAP: Record<string, ICliente['nivelActividad']> = {
  sedentario: 'Sedentario',
  ligero: 'Sedentario',
  moderado: 'Moderado',
  activo: 'Activo',
  'muy activo': 'Muy activo',
};

const ESTRES_MAP: Record<string, number> = {
  bajo: 2,
  moderado: 3,
  alto: 5,
};

/** Sync intake questionnaire summary fields onto Cliente for clinical PDF compatibility. */
export function aplicarCuestionarioACliente(
  cliente: ICliente,
  q: Partial<ICuestionarioIngreso> | Record<string, unknown>
): void {
  const datos = (q.datosPersonales || {}) as {
    ocupacion?: string;
    telefono?: string;
  };
  if (datos.ocupacion) cliente.ocupacion = datos.ocupacion;
  if (datos.telefono) cliente.telefono = datos.telefono;

  const objetivoPrincipal = q.objetivoPrincipal as string | undefined;
  const objetivoDetalle = q.objetivoDetalle as string | undefined;
  if (objetivoPrincipal || objetivoDetalle) {
    cliente.objetivo = [objetivoPrincipal, objetivoDetalle].filter(Boolean).join(' — ');
  }

  // Decrypt existing antecedentes BEFORE merge to prevent double-AES encryption on save.
  const prevPlain = (descifrarAntecedentes(
    (cliente.antecedentes || {}) as Record<string, string>
  ) || {}) as {
    enfermedades?: string;
    cirugias?: string;
    lesiones?: string;
    medicamentos?: string;
    alergias?: string;
  };

  const hm = (q.historialMedico || {}) as {
    condicionesDiagnosticadas?: string[];
    medicamentosActuales?: string;
    cirugiasLesiones?: string;
    restriccionesFisicas?: string;
  };

  cliente.antecedentes = {
    enfermedades: hm.condicionesDiagnosticadas?.join(', ') || prevPlain.enfermedades,
    medicamentos: hm.medicamentosActuales || prevPlain.medicamentos,
    cirugias: hm.cirugiasLesiones || prevPlain.cirugias,
    lesiones: hm.restriccionesFisicas || prevPlain.lesiones,
    alergias: prevPlain.alergias,
  };

  const act = (q.historialActividadFisica || {}) as { nivelActividad?: string };
  if (act.nivelActividad && NIVEL_MAP[act.nivelActividad]) {
    cliente.nivelActividad = NIVEL_MAP[act.nivelActividad];
  }

  const nut = (q.nutricion || {}) as {
    alergiasIntolerancias?: string;
    consumoAguaLitros?: number;
  };
  if (nut.alergiasIntolerancias) {
    cliente.antecedentes = {
      ...(cliente.antecedentes || {}),
      alergias: nut.alergiasIntolerancias,
    };
  }

  const estilo = (q.estiloDeVida || {}) as {
    horasSueno?: number;
    nivelEstres?: string;
    consumoAlcohol?: string;
    consumoTabaco?: boolean;
  };
  const disp = (q.disponibilidad || {}) as { horarioPreferido?: string };

  cliente.habitos = {
    ...(cliente.habitos || {}),
    calidadSueno:
      typeof estilo.horasSueno === 'number'
        ? Math.min(5, Math.max(1, Math.round(estilo.horasSueno / 2)))
        : cliente.habitos?.calidadSueno,
    nivelEstres: estilo.nivelEstres ? ESTRES_MAP[estilo.nivelEstres] : cliente.habitos?.nivelEstres,
    consumoAgua:
      typeof nut.consumoAguaLitros === 'number'
        ? `${nut.consumoAguaLitros} L`
        : cliente.habitos?.consumoAgua,
    alcohol: estilo.consumoAlcohol || cliente.habitos?.alcohol,
    tabaco:
      typeof estilo.consumoTabaco === 'boolean'
        ? estilo.consumoTabaco
          ? 'Sí'
          : 'No'
        : cliente.habitos?.tabaco,
  };

  if (disp.horarioPreferido) {
    cliente.tiempoDisponible = disp.horarioPreferido;
  }
}
