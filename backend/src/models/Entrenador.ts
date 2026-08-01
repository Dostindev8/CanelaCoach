import { Schema, model, Document, Types } from 'mongoose';
import { cifrarCampo, descifrarCampo } from '../utils/campoCifrado.js';

export interface IEntrenador extends Document {
  nombre: string;
  email: string;
  passwordHash: string;
  rol: 'admin' | 'entrenador';
  logoUrl: string;
  photoUrl?: string | null;
  photoPublicId?: string | null;
  invitationCode?: string | null;
  activo: boolean;
  limiteClientes: number;
  mfaSecret?: string;
  mfaHabilitado: boolean;
  mfaObligatorio: boolean;
  intentosFallidosLogin: number;
  bloqueadoHasta?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const EntrenadorSchema = new Schema<IEntrenador>(
  {
    nombre: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    rol: { type: String, enum: ['admin', 'entrenador'], default: 'entrenador' },
    logoUrl: { type: String, default: '' },
    photoUrl: { type: String, default: null },
    photoPublicId: { type: String, default: null, select: false },
    invitationCode: { type: String, unique: true, sparse: true, uppercase: true, trim: true },
    activo: { type: Boolean, default: true },
    limiteClientes: { type: Number, default: 1000 },
    mfaSecret: { type: String, select: false },
    mfaHabilitado: { type: Boolean, default: false },
    mfaObligatorio: { type: Boolean, default: false },
    intentosFallidosLogin: { type: Number, default: 0 },
    bloqueadoHasta: { type: Date },
  },
  { timestamps: true }
);

EntrenadorSchema.pre('validate', function (next) {
  if (!this.invitationCode) {
    this.invitationCode = `CC-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  }
  next();
});

EntrenadorSchema.pre('save', function (next) {
  // MFA obligatorio para admin solo en producción (local/QA sin TOTP bloqueaba el panel)
  if (this.rol === 'admin' && process.env.NODE_ENV === 'production') {
    this.mfaObligatorio = true;
  }
  if (this.isModified('mfaSecret') && this.mfaSecret && !this.mfaSecret.startsWith('enc:')) {
    this.mfaSecret = 'enc:' + cifrarCampo(this.mfaSecret);
  }
  next();
});

EntrenadorSchema.methods.getMfaSecretPlain = function (): string | null {
  if (!this.mfaSecret) return null;
  if (this.mfaSecret.startsWith('enc:')) {
    return descifrarCampo(this.mfaSecret.slice(4));
  }
  return this.mfaSecret;
};

export const Entrenador = model<IEntrenador>('Entrenador', EntrenadorSchema);
