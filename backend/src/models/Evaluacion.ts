import { Schema, model, Document, Types, Model } from 'mongoose';

export interface IScoreFisico {
  valor: number;
  delta: number;
  celebracion: boolean;
  motivo: string;
}

export interface IEvaluacion extends Document {
  clienteId: Types.ObjectId;
  entrenadorId: Types.ObjectId;
  fecha: Date;
  tipo: 'inicial' | 'seguimiento';
  antropometria?: {
    peso?: number;
    estatura?: number;
    imc?: number;
    cuello?: number;
    torax?: number;
    hombros?: number;
    pecho?: number;
    biceps?: number;
    brazoDerecho?: number;
    brazoIzquierdo?: number;
    antebrazo?: number;
    cintura?: number;
    abdomen?: number;
    cadera?: number;
    gluteos?: number;
    cuadriceps?: number;
    musloDerecho?: number;
    musloIzquierdo?: number;
    pantorrilla?: number;
    cinturaEstatura?: number;
    cinturaCadera?: number;
    sumaMedidasCm?: number;
    presionArterial?: string;
    frecuenciaCardiaca?: number;
  };
  pliegues?: {
    tricipital?: number;
    pectoral?: number;
    escapular?: number;
    abdominal?: number;
    suprailiaco?: number;
    muslo?: number;
    pantorrilla?: number;
  };
  diametrosOseos?: {
    codo?: number;
    rodilla?: number;
    muneca?: number;
  };
  composicionCorporal?: {
    grasaCorporalPct?: number;
    grasaCorporalLb?: number;
    masaMagra?: number;
    masaMuscular?: number;
    aguaCorporalPct?: number;
    grasaVisceral?: number;
  };
  resultadosCalculados?: {
    imc?: number;
    porcentajeGrasaCorporal?: number;
    masaMuscular?: number;
    masaLibreGrasa?: number;
    masaOsea?: number;
    aguaCorporal?: number;
    grasaVisceral?: number;
    metabolismoBasal?: number;
    relacionCinturaCadera?: number;
    pesoIdeal?: number;
    pesoObjetivo?: number;
    disclaimers?: string[];
    confianza?: Record<string, string>;
  };
  pesoObjetivoEditable?: number;
  objetivosProximoMes?: string;
  /** Peso en lb (fuente de verdad dual con antropometria.peso en kg) */
  weightLb?: number | null;
  observacionesDesdeUltima?: string | null;
  smartScale?: {
    capturedAt?: Date | null;
    status?: 'Bajo' | 'Saludable' | 'Alto' | 'Obeso' | null;
    weightKg?: number | null;
    bmi?: number | null;
    bodyFatPercent?: number | null;
    fatMassKg?: number | null;
    skeletalMuscleMassPercent?: number | null;
    skeletalMuscleMassKg?: number | null;
    musclePercent?: number | null;
    muscleMassKg?: number | null;
    waterPercent?: number | null;
    waterMassKg?: number | null;
    visceralFat?: number | null;
    metabolismKcalDay?: number | null;
    heightCmDevice?: number | null;
    ageDeviceEstimate?: number | null;
  };
  attachments?: Array<{
    kind: 'front' | 'back' | 'profile' | 'scale_screenshot';
    url: string;
    uploadedAt?: Date;
  }>;
  /** Soft-delete — nunca borrado físico de datos clínicos */
  activo?: boolean;
  deletedAt?: Date | null;
  /** Campo clínico cifrado (AES-256-GCM) — presión arterial */
  bloodPressureEnc?: string | null;
  evaluacionPostural?: Record<string, string>;
  evaluacionFuncional?: Record<string, string>;
  condicionFisica?: Record<string, string | number>;
  fotografias?: {
    frenteUrl?: string;
    perfilDerechoUrl?: string;
    espaldaUrl?: string;
  };
  diagnostico?: {
    composicionCorporalTexto?: string;
    condicionFisicaTexto?: string;
    habitosTexto?: string;
    potencial?: string;
    resumen?: string;
  };
  planAccion?: {
    items?: string[];
    focoPrincipal?: string;
  };
  notasEntrenador?: string;
  puntosAMejorar?: string[];
  scoreFisico?: IScoreFisico;
  reporte?: {
    pdfUrl?: string;
    mensualPdfUrl?: string;
    generadoEn?: Date;
    enviado?: boolean;
    enviadoEn?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

interface EvaluacionModel extends Model<IEvaluacion> {
  obtenerAnterior(clienteId: Types.ObjectId | string, fecha: Date): Promise<IEvaluacion | null>;
}

const EvaluacionSchema = new Schema<IEvaluacion, EvaluacionModel>(
  {
    clienteId: { type: Schema.Types.ObjectId, ref: 'Cliente', required: true, index: true },
    entrenadorId: { type: Schema.Types.ObjectId, ref: 'Entrenador', required: true, index: true },
    fecha: { type: Date, required: true, default: Date.now },
    tipo: { type: String, enum: ['inicial', 'seguimiento'], default: 'seguimiento' },
    antropometria: {
      peso: Number,
      estatura: Number,
      imc: Number,
      cuello: Number,
      torax: Number,
      hombros: Number,
      pecho: Number,
      biceps: Number,
      brazoDerecho: Number,
      brazoIzquierdo: Number,
      antebrazo: Number,
      cintura: Number,
      abdomen: Number,
      cadera: Number,
      gluteos: Number,
      cuadriceps: Number,
      musloDerecho: Number,
      musloIzquierdo: Number,
      pantorrilla: Number,
      cinturaEstatura: Number,
      cinturaCadera: Number,
      sumaMedidasCm: Number,
      presionArterial: String,
      frecuenciaCardiaca: Number,
    },
    pliegues: {
      tricipital: Number,
      pectoral: Number,
      escapular: Number,
      abdominal: Number,
      suprailiaco: Number,
      muslo: Number,
      pantorrilla: Number,
    },
    diametrosOseos: {
      codo: Number,
      rodilla: Number,
      muneca: Number,
    },
    composicionCorporal: {
      grasaCorporalPct: Number,
      grasaCorporalLb: Number,
      masaMagra: Number,
      masaMuscular: Number,
      aguaCorporalPct: Number,
      grasaVisceral: Number,
    },
    resultadosCalculados: {
      imc: Number,
      porcentajeGrasaCorporal: Number,
      masaMuscular: Number,
      masaLibreGrasa: Number,
      masaOsea: Number,
      aguaCorporal: Number,
      grasaVisceral: Number,
      metabolismoBasal: Number,
      relacionCinturaCadera: Number,
      pesoIdeal: Number,
      pesoObjetivo: Number,
      disclaimers: [String],
      confianza: Schema.Types.Mixed,
    },
    pesoObjetivoEditable: Number,
    objetivosProximoMes: { type: String, maxlength: 5000 },
    weightLb: { type: Number, default: null },
    observacionesDesdeUltima: { type: String, default: null, maxlength: 5000 },
    smartScale: {
      capturedAt: Date,
      status: { type: String, enum: ['Bajo', 'Saludable', 'Alto', 'Obeso'] },
      weightKg: Number,
      bmi: Number,
      bodyFatPercent: Number,
      fatMassKg: Number,
      skeletalMuscleMassPercent: Number,
      skeletalMuscleMassKg: Number,
      musclePercent: Number,
      muscleMassKg: Number,
      waterPercent: Number,
      waterMassKg: Number,
      visceralFat: Number,
      metabolismKcalDay: Number,
      heightCmDevice: Number,
      ageDeviceEstimate: Number,
    },
    attachments: [
      {
        kind: {
          type: String,
          enum: ['front', 'back', 'profile', 'scale_screenshot'],
        },
        url: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    activo: { type: Boolean, default: true, index: true },
    deletedAt: { type: Date, default: null },
    bloodPressureEnc: { type: String, default: null, select: false },
    evaluacionPostural: {
      cabeza: String,
      hombros: String,
      escapulas: String,
      columna: String,
      pelvis: String,
      rodillas: String,
      tobillosPies: String,
    },
    evaluacionFuncional: {
      movilidadHombros: String,
      movilidadCadera: String,
      movilidadTobillos: String,
      sentadilla: String,
      equilibrio: String,
      coreEstabilidad: String,
      flexibilidadGeneral: String,
      dolorActual: String,
      limitaciones: String,
    },
    condicionFisica: {
      frecuenciaCardiaca: Number,
      presionArterial: String,
      plank: Number,
      flexiones: Number,
      sentadillas: Number,
      cardioMin: Number,
      fuerzaGeneral: String,
      resistencia: String,
      fuerzaAgarre: Number,
      saltoVertical: Number,
    },
    fotografias: {
      frenteUrl: String,
      perfilDerechoUrl: String,
      espaldaUrl: String,
    },
    diagnostico: {
      composicionCorporalTexto: String,
      condicionFisicaTexto: String,
      habitosTexto: String,
      potencial: String,
      resumen: String,
    },
    planAccion: {
      items: [String],
      focoPrincipal: String,
    },
    notasEntrenador: { type: String, maxlength: 5000 },
    puntosAMejorar: [String],
    scoreFisico: {
      valor: { type: Number, min: 0, max: 100 },
      delta: Number,
      celebracion: { type: Boolean, default: false },
      motivo: String,
    },
    reporte: {
      pdfUrl: String,
      mensualPdfUrl: String,
      generadoEn: Date,
      enviado: { type: Boolean, default: false },
      enviadoEn: Date,
    },
  },
  { timestamps: true }
);

EvaluacionSchema.index({ clienteId: 1, fecha: -1 });
EvaluacionSchema.index({ entrenadorId: 1, fecha: -1 });
EvaluacionSchema.index({ clienteId: 1, activo: 1, fecha: -1 });

EvaluacionSchema.pre('save', function (next) {
  const m = this.antropometria;
  if (m) {
    const sum = [
      m.cuello,
      m.torax,
      m.biceps,
      m.cintura,
      m.gluteos,
      m.cuadriceps,
      m.pantorrilla,
    ].reduce((s: number, v) => s + (typeof v === 'number' ? v : 0), 0);
    if (sum > 0) m.sumaMedidasCm = sum;
  }
  next();
});

EvaluacionSchema.statics.obtenerAnterior = function (clienteId, fecha) {
  return this.findOne({
    clienteId,
    fecha: { $lt: fecha },
    activo: { $ne: false },
  }).sort({ fecha: -1 });
};

export const Evaluacion = model<IEvaluacion, EvaluacionModel>('Evaluacion', EvaluacionSchema);
