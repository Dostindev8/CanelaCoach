import { Schema, model, Document, Types } from 'mongoose';
import { cifrarAntecedentes, descifrarAntecedentes } from '../utils/campoCifrado.js';
import {
  computeMembershipStatus,
  defaultPeriodEnd,
  type IPaymentHistoryEntry,
  type MembershipStatus,
} from '../services/membership.js';

export interface ICliente extends Document {
  entrenadorId: Types.ObjectId;
  codigoCliente: string;
  nombre: string;
  edad: number;
  sexo: 'Masculino' | 'Femenino';
  ocupacion?: string;
  estadoCivil?: string;
  nivelActividad?: 'Sedentario' | 'Moderado' | 'Activo' | 'Muy activo';
  tiempoDisponible?: string;
  objetivo?: string;
  fotoPerfilUrl?: string;
  email?: string;
  telefono?: string;
  fechaNacimiento?: Date;
  direccion?: string;
  profesion?: string;
  pesoInicial?: number;
  estaturaInicial?: number;
  fotografiasIniciales?: string[];
  antecedentesFamiliares?: string;
  suplementos?: string;
  horariosComida?: string;
  alimentosConsume?: string;
  alimentosNoLeGustan?: string;
  antecedentes?: {
    enfermedades?: string;
    cirugias?: string;
    lesiones?: string;
    medicamentos?: string;
    alergias?: string;
  };
  habitos?: {
    calidadSueno?: number;
    nivelEstres?: number;
    consumoAgua?: string;
    alcohol?: string;
    tabaco?: string;
  };
  /** Soft-delete (archivado). Distinto de membershipStatus. */
  activo: boolean;
  /** Membresía / cobranza — los inactivos por pago siguen visibles. */
  membershipStatus: MembershipStatus;
  currentPeriodEnd: Date;
  gracePeriodDays: number;
  paymentHistory: IPaymentHistoryEntry[];
  nextEvaluationDate?: Date | null;
  lastEvaluationDate?: Date | null;
  evaluationFrequencyDays: number;
  lastReminderSentAt?: Date | null;
  /** Portal self-auth (MEGA-18) — parallel to PacienteCuenta; does not replace coach fields. */
  passwordHash?: string;
  cuentaActiva?: boolean;
  emailVerificado?: boolean;
  tokenVerificacionEmail?: string | null;
  tokenVerificacionExpira?: Date | null;
  tokenResetPassword?: string | null;
  tokenResetPasswordExpira?: Date | null;
  codigoInvitacion?: string | null;
  intentosFallidosLogin?: number;
  bloqueadoHasta?: Date | null;
  ultimoAcceso?: Date | null;
  sesionVersion?: number;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentHistorySchema = new Schema(
  {
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: ['DOP', 'USD'], default: 'DOP' },
    paidAt: { type: Date, required: true },
    method: { type: String, enum: ['cash', 'transfer', 'card', 'other'], required: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    registeredBy: { type: Schema.Types.ObjectId, ref: 'Entrenador', required: true },
    notes: { type: String, maxlength: 500 },
  },
  { timestamps: true }
);

const ClienteSchema = new Schema<ICliente>(
  {
    entrenadorId: { type: Schema.Types.ObjectId, ref: 'Entrenador', required: true, index: true },
    codigoCliente: { type: String, required: true, unique: true },
    nombre: { type: String, required: true, trim: true },
    edad: { type: Number, required: true, min: 1, max: 120 },
    sexo: { type: String, enum: ['Masculino', 'Femenino'], required: true },
    ocupacion: String,
    estadoCivil: String,
    nivelActividad: { type: String, enum: ['Sedentario', 'Moderado', 'Activo', 'Muy activo'] },
    tiempoDisponible: String,
    objetivo: String,
    fotoPerfilUrl: String,
    email: { type: String, lowercase: true, trim: true },
    telefono: String,
    fechaNacimiento: Date,
    direccion: String,
    profesion: String,
    pesoInicial: Number,
    estaturaInicial: Number,
    fotografiasIniciales: [String],
    antecedentesFamiliares: String,
    suplementos: String,
    horariosComida: String,
    alimentosConsume: String,
    alimentosNoLeGustan: String,
    antecedentes: {
      enfermedades: String,
      cirugias: String,
      lesiones: String,
      medicamentos: String,
      alergias: String,
    },
    habitos: {
      calidadSueno: { type: Number, min: 1, max: 5 },
      nivelEstres: { type: Number, min: 1, max: 5 },
      consumoAgua: String,
      alcohol: String,
      tabaco: String,
    },
    activo: { type: Boolean, default: true },
    membershipStatus: {
      type: String,
      enum: ['active', 'inactive', 'paused', 'cancelled'],
      default: 'active',
      index: true,
    },
    currentPeriodEnd: { type: Date, default: () => defaultPeriodEnd() },
    gracePeriodDays: { type: Number, default: 5, min: 0, max: 60 },
    paymentHistory: { type: [PaymentHistorySchema], default: [] },
    nextEvaluationDate: { type: Date, default: null },
    lastEvaluationDate: { type: Date, default: null },
    evaluationFrequencyDays: { type: Number, default: 30, min: 7, max: 365 },
    lastReminderSentAt: { type: Date, default: null },
    // ── Portal cliente auth (MEGA-18) — fields only added; existing email kept ──
    passwordHash: { type: String, select: false },
    cuentaActiva: { type: Boolean, default: false },
    emailVerificado: { type: Boolean, default: false },
    tokenVerificacionEmail: { type: String, select: false, default: null },
    tokenVerificacionExpira: { type: Date, select: false, default: null },
    tokenResetPassword: { type: String, select: false, default: null },
    tokenResetPasswordExpira: { type: Date, select: false, default: null },
    codigoInvitacion: { type: String, select: false, default: null },
    intentosFallidosLogin: { type: Number, default: 0 },
    bloqueadoHasta: { type: Date, default: null },
    ultimoAcceso: { type: Date, default: null },
    sesionVersion: { type: Number, default: 0 },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

ClienteSchema.index({ entrenadorId: 1, nombre: 1 });
ClienteSchema.index({ entrenadorId: 1, activo: 1 });
ClienteSchema.index({ entrenadorId: 1, membershipStatus: 1 });
ClienteSchema.index({ nextEvaluationDate: 1, membershipStatus: 1 });
ClienteSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { email: { $type: 'string', $gt: '' } } }
);
ClienteSchema.index({ entrenadorId: 1, email: 1 });

ClienteSchema.virtual('computedStatus').get(function (this: ICliente) {
  return computeMembershipStatus({
    membershipStatus: this.membershipStatus,
    currentPeriodEnd: this.currentPeriodEnd,
    gracePeriodDays: this.gracePeriodDays,
  });
});

function generarCodigo(): string {
  const now = new Date();
  const aa = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const nn = String(Math.floor(Math.random() * 90) + 10);
  return `CC-${aa}${mm}${dd}-${nn}`;
}

ClienteSchema.pre('validate', async function (next) {
  if (!this.codigoCliente) {
    let codigo = generarCodigo();
    let attempts = 0;
    while (attempts < 10) {
      const exists = await model('Cliente').exists({ codigoCliente: codigo });
      if (!exists) break;
      codigo = generarCodigo();
      attempts++;
    }
    this.codigoCliente = codigo;
  }
  if (!this.currentPeriodEnd) {
    this.currentPeriodEnd = defaultPeriodEnd();
  }
  next();
});

ClienteSchema.pre('save', function (next) {
  if (this.isModified('antecedentes') && this.antecedentes) {
    this.antecedentes = cifrarAntecedentes(this.antecedentes as Record<string, string>) as typeof this.antecedentes;
  }
  next();
});

ClienteSchema.methods.toSafeObject = function (decrypt = true) {
  const obj = this.toObject();
  if (decrypt && obj.antecedentes) {
    obj.antecedentes = descifrarAntecedentes(obj.antecedentes);
  }
  return obj;
};

export function clienteConAntecedentesDescifrados(doc: ICliente | Record<string, unknown>) {
  const obj = typeof (doc as ICliente).toObject === 'function' ? (doc as ICliente).toObject() : { ...doc };
  if (obj.antecedentes) {
    obj.antecedentes = descifrarAntecedentes(obj.antecedentes as Record<string, string>);
  }
  const computed = computeMembershipStatus({
    membershipStatus: obj.membershipStatus as MembershipStatus,
    currentPeriodEnd: obj.currentPeriodEnd as Date,
    gracePeriodDays: obj.gracePeriodDays as number,
  });
  return { ...obj, computedStatus: computed };
}

export const Cliente = model<ICliente>('Cliente', ClienteSchema);
