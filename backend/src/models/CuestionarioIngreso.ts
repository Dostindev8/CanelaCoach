import { Schema, model, Document, Types } from 'mongoose';
import { cifrarCampo, descifrarCampo } from '../utils/campoCifrado.js';

export const OBJETIVOS_PRINCIPALES = [
  'pérdida de grasa',
  'ganancia muscular',
  'tonificación',
  'salud general',
  'preparación deportiva',
  'otro',
] as const;

export type ObjetivoPrincipal = (typeof OBJETIVOS_PRINCIPALES)[number];

export interface ICuestionarioIngreso extends Document {
  clienteId: Types.ObjectId;
  entrenadorId: Types.ObjectId;
  datosPersonales?: {
    ocupacion?: string;
    telefono?: string;
    contactoEmergenciaNombre?: string;
    contactoEmergenciaTelefono?: string;
  };
  objetivoPrincipal?: ObjetivoPrincipal;
  objetivoDetalle?: string;
  historialMedico?: {
    condicionesDiagnosticadas?: string[];
    medicamentosActuales?: string;
    cirugiasLesiones?: string;
    restriccionesFisicas?: string;
    autorizacionMedica?: boolean;
  };
  historialActividadFisica?: {
    entrenoAntes?: boolean;
    tiempoEntrenando?: string;
    actividadActual?: string;
    nivelActividad?: 'sedentario' | 'ligero' | 'moderado' | 'activo' | 'muy activo';
  };
  nutricion?: {
    dietaActual?: string;
    alergiasIntolerancias?: string;
    comidasPorDia?: number;
    consumoAguaLitros?: number;
  };
  estiloDeVida?: {
    horasSueno?: number;
    nivelEstres?: 'bajo' | 'moderado' | 'alto';
    consumoAlcohol?: 'nunca' | 'ocasional' | 'frecuente';
    consumoTabaco?: boolean;
    ocupacionSedentaria?: boolean;
  };
  disponibilidad?: {
    diasDisponibles?: string[];
    horarioPreferido?: string;
    accesoGimnasio?: boolean;
    equipoDisponible?: string;
  };
  consentimientoInformado?: {
    aceptaTerminos?: boolean;
    aceptaEvaluacionesFisicas?: boolean;
    firmaDigital?: string;
    fechaConsentimiento?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const SENSITIVE_MED = ['medicamentosActuales', 'cirugiasLesiones', 'restriccionesFisicas'] as const;

const CuestionarioIngresoSchema = new Schema<ICuestionarioIngreso>(
  {
    clienteId: { type: Schema.Types.ObjectId, ref: 'Cliente', required: true, unique: true },
    entrenadorId: { type: Schema.Types.ObjectId, ref: 'Entrenador', required: true, index: true },
    datosPersonales: {
      ocupacion: String,
      telefono: String,
      contactoEmergenciaNombre: String,
      contactoEmergenciaTelefono: String,
    },
    objetivoPrincipal: {
      type: String,
      enum: OBJETIVOS_PRINCIPALES,
    },
    objetivoDetalle: String,
    historialMedico: {
      condicionesDiagnosticadas: [String],
      medicamentosActuales: String,
      cirugiasLesiones: String,
      restriccionesFisicas: String,
      autorizacionMedica: Boolean,
    },
    historialActividadFisica: {
      entrenoAntes: Boolean,
      tiempoEntrenando: String,
      actividadActual: String,
      nivelActividad: {
        type: String,
        enum: ['sedentario', 'ligero', 'moderado', 'activo', 'muy activo'],
      },
    },
    nutricion: {
      dietaActual: String,
      alergiasIntolerancias: String,
      comidasPorDia: Number,
      consumoAguaLitros: Number,
    },
    estiloDeVida: {
      horasSueno: Number,
      nivelEstres: { type: String, enum: ['bajo', 'moderado', 'alto'] },
      consumoAlcohol: { type: String, enum: ['nunca', 'ocasional', 'frecuente'] },
      consumoTabaco: Boolean,
      ocupacionSedentaria: Boolean,
    },
    disponibilidad: {
      diasDisponibles: [String],
      horarioPreferido: String,
      accesoGimnasio: Boolean,
      equipoDisponible: String,
    },
    consentimientoInformado: {
      aceptaTerminos: Boolean,
      aceptaEvaluacionesFisicas: Boolean,
      firmaDigital: String,
      fechaConsentimiento: Date,
    },
  },
  { timestamps: true }
);

CuestionarioIngresoSchema.index({ entrenadorId: 1, clienteId: 1 });

CuestionarioIngresoSchema.pre('save', function (next) {
  if (this.isModified('historialMedico') && this.historialMedico) {
    for (const key of SENSITIVE_MED) {
      const val = this.historialMedico[key];
      if (typeof val === 'string' && val.length > 0) {
        this.historialMedico[key] = cifrarCampo(val);
      }
    }
  }
  next();
});

export function cuestionarioDescifrado(doc: ICuestionarioIngreso | Record<string, unknown>) {
  const obj =
    typeof (doc as ICuestionarioIngreso).toObject === 'function'
      ? (doc as ICuestionarioIngreso).toObject()
      : { ...doc };
  if (obj.historialMedico) {
    const hm = { ...obj.historialMedico } as Record<string, unknown>;
    for (const key of SENSITIVE_MED) {
      if (typeof hm[key] === 'string' && (hm[key] as string).length > 0) {
        hm[key] = descifrarCampo(hm[key] as string);
      }
    }
    obj.historialMedico = hm;
  }
  return obj;
}

export const CuestionarioIngreso = model<ICuestionarioIngreso>(
  'CuestionarioIngreso',
  CuestionarioIngresoSchema
);
