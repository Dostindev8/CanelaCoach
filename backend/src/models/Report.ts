import { Schema, model, Document, Types } from 'mongoose';

export interface IReport extends Document {
  evaluacionId: Types.ObjectId;
  clienteId: Types.ObjectId;
  entrenadorId: Types.ObjectId;
  tipo: 'clinico' | 'mensual';
  pdfUrl: string;
  generadoEn: Date;
  enviadoWhatsApp?: boolean;
  enviadoEmail?: boolean;
  enviadoEn?: Date;
}

const ReportSchema = new Schema<IReport>(
  {
    evaluacionId: { type: Schema.Types.ObjectId, ref: 'Evaluacion', required: true, index: true },
    clienteId: { type: Schema.Types.ObjectId, ref: 'Cliente', required: true, index: true },
    entrenadorId: { type: Schema.Types.ObjectId, ref: 'Entrenador', required: true, index: true },
    tipo: { type: String, enum: ['clinico', 'mensual'], required: true },
    pdfUrl: { type: String, required: true },
    generadoEn: { type: Date, default: Date.now },
    enviadoWhatsApp: { type: Boolean, default: false },
    enviadoEmail: { type: Boolean, default: false },
    enviadoEn: Date,
  },
  { timestamps: true }
);

export const Report = model<IReport>('Report', ReportSchema);
