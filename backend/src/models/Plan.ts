import { Schema, model, Document, Types } from 'mongoose';

export type PlanTipo = 'dieta' | 'rutina' | 'suplementacion' | 'protocolo' | 'recomendacion';

export interface IPlan extends Document {
  entrenadorId: Types.ObjectId;
  tipo: PlanTipo;
  nombre: string;
  contenido: string; // plain/markdown — HOOK FUTURO IA: texto estructurado legible
  tags: string[];
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PlanSchema = new Schema<IPlan>(
  {
    entrenadorId: { type: Schema.Types.ObjectId, ref: 'Entrenador', required: true, index: true },
    tipo: {
      type: String,
      enum: ['dieta', 'rutina', 'suplementacion', 'protocolo', 'recomendacion'],
      required: true,
    },
    nombre: { type: String, required: true, trim: true, maxlength: 200 },
    contenido: { type: String, required: true, maxlength: 50000 },
    tags: [{ type: String, maxlength: 40 }],
    activo: { type: Boolean, default: true },
  },
  { timestamps: true }
);

PlanSchema.index({ entrenadorId: 1, tipo: 1, activo: 1 });

export const Plan = model<IPlan>('Plan', PlanSchema);

export interface IPlanAsignacion extends Document {
  planId: Types.ObjectId;
  clienteId: Types.ObjectId;
  entrenadorId: Types.ObjectId;
  notas?: string;
  asignadoEn: Date;
  activo: boolean;
}

const PlanAsignacionSchema = new Schema<IPlanAsignacion>(
  {
    planId: { type: Schema.Types.ObjectId, ref: 'Plan', required: true, index: true },
    clienteId: { type: Schema.Types.ObjectId, ref: 'Cliente', required: true, index: true },
    entrenadorId: { type: Schema.Types.ObjectId, ref: 'Entrenador', required: true, index: true },
    notas: { type: String, maxlength: 2000 },
    asignadoEn: { type: Date, default: Date.now },
    activo: { type: Boolean, default: true },
  },
  { timestamps: true }
);

PlanAsignacionSchema.index({ clienteId: 1, activo: 1 });

export const PlanAsignacion = model<IPlanAsignacion>('PlanAsignacion', PlanAsignacionSchema);
