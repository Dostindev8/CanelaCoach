import { Schema, model, Document, Types } from 'mongoose';
import crypto from 'crypto';

export type AccionAudit = 'lectura' | 'creacion' | 'edicion' | 'eliminacion' | 'envio_reporte';

export interface IAuditLog extends Document {
  entrenadorId: Types.ObjectId;
  clienteId?: Types.ObjectId;
  accion: AccionAudit;
  entidad: string;
  entidadId: Types.ObjectId;
  ip?: string;
  userAgent?: string;
  hashAnterior: string;
  hashActual: string;
  timestamp: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    entrenadorId: { type: Schema.Types.ObjectId, ref: 'Entrenador', required: true, index: true },
    clienteId: { type: Schema.Types.ObjectId, ref: 'Cliente', index: true },
    accion: {
      type: String,
      enum: ['lectura', 'creacion', 'edicion', 'eliminacion', 'envio_reporte'],
      required: true,
    },
    entidad: { type: String, required: true },
    entidadId: { type: Schema.Types.ObjectId, required: true },
    ip: String,
    userAgent: String,
    hashAnterior: { type: String, required: true },
    hashActual: { type: String, required: true },
    timestamp: { type: Date, default: Date.now, immutable: true },
  },
  { timestamps: false }
);

AuditLogSchema.index({ timestamp: -1 });
AuditLogSchema.index({ entidad: 1, entidadId: 1 });

// Append-only: block updates/deletes at schema level
AuditLogSchema.pre(['updateOne', 'updateMany', 'findOneAndUpdate', 'deleteOne', 'deleteMany', 'findOneAndDelete'], function () {
  throw new Error('AuditLog es append-only: UPDATE/DELETE prohibidos');
});

export function computeAuditHash(hashAnterior: string, payload: object, timestamp: Date): string {
  return crypto
    .createHash('sha256')
    .update(hashAnterior + JSON.stringify(payload) + timestamp.toISOString())
    .digest('hex');
}

export const GENESIS_HASH = '0'.repeat(64);

export const AuditLog = model<IAuditLog>('AuditLog', AuditLogSchema);
