import { Schema, model, Document, Types } from 'mongoose';

export interface ICita extends Document {
  entrenadorId: Types.ObjectId;
  clienteId: Types.ObjectId;
  fecha: Date;
  notas?: string;
  estado: 'programada' | 'completada' | 'cancelada';
  createdAt: Date;
  updatedAt: Date;
}

const CitaSchema = new Schema<ICita>(
  {
    entrenadorId: { type: Schema.Types.ObjectId, ref: 'Entrenador', required: true, index: true },
    clienteId: { type: Schema.Types.ObjectId, ref: 'Cliente', required: true, index: true },
    fecha: { type: Date, required: true, index: true },
    notas: { type: String, maxlength: 2000 },
    estado: {
      type: String,
      enum: ['programada', 'completada', 'cancelada'],
      default: 'programada',
    },
  },
  { timestamps: true }
);

CitaSchema.index({ entrenadorId: 1, fecha: 1 });

export const Cita = model<ICita>('Cita', CitaSchema);
