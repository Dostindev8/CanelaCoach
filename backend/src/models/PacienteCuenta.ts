import { Schema, model, Document, Types } from 'mongoose';

/** Patient portal account — separate from Entrenador auth. */
export interface IPacienteCuenta extends Document {
  clienteId: Types.ObjectId;
  entrenadorId: Types.ObjectId;
  email: string;
  passwordHash: string;
  activo: boolean;
  ultimoAcceso?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PacienteCuentaSchema = new Schema<IPacienteCuenta>(
  {
    clienteId: { type: Schema.Types.ObjectId, ref: 'Cliente', required: true, unique: true },
    entrenadorId: { type: Schema.Types.ObjectId, ref: 'Entrenador', required: true, index: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    activo: { type: Boolean, default: true },
    ultimoAcceso: Date,
  },
  { timestamps: true }
);

export const PacienteCuenta = model<IPacienteCuenta>('PacienteCuenta', PacienteCuentaSchema);
