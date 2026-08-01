import { Schema, model, Document, Types } from 'mongoose';

export interface ICodigoInvitacion extends Document {
  entrenadorId: Types.ObjectId;
  codigo: string;
  clienteIdPreexistente?: Types.ObjectId | null;
  usado: boolean;
  usadoPor?: Types.ObjectId | null;
  expiraEn: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CodigoInvitacionSchema = new Schema<ICodigoInvitacion>(
  {
    entrenadorId: { type: Schema.Types.ObjectId, ref: 'Entrenador', required: true, index: true },
    codigo: { type: String, required: true, unique: true, uppercase: true, trim: true },
    clienteIdPreexistente: { type: Schema.Types.ObjectId, ref: 'Cliente', default: null },
    usado: { type: Boolean, default: false },
    usadoPor: { type: Schema.Types.ObjectId, ref: 'Cliente', default: null },
    expiraEn: { type: Date, required: true },
  },
  { timestamps: true }
);

CodigoInvitacionSchema.index({ entrenadorId: 1, usado: 1 });

export const CodigoInvitacion = model<ICodigoInvitacion>('CodigoInvitacion', CodigoInvitacionSchema);
