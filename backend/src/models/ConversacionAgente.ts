import { Schema, model, Document, Types } from 'mongoose';

export interface IConversacionAgente extends Document {
  entrenadorId: Types.ObjectId;
  clienteId?: Types.ObjectId;
  canal: 'texto' | 'voz';
  mensajes: Array<{
    rol: 'usuario' | 'agente';
    contenido: string;
    audioUrl?: string;
    timestamp: Date;
  }>;
  modeloUsado: string;
  tokensUsados: number;
  cerrada: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ConversacionAgenteSchema = new Schema<IConversacionAgente>(
  {
    entrenadorId: { type: Schema.Types.ObjectId, ref: 'Entrenador', required: true, index: true },
    clienteId: { type: Schema.Types.ObjectId, ref: 'Cliente', index: true },
    canal: { type: String, enum: ['texto', 'voz'], default: 'texto' },
    mensajes: [
      {
        rol: { type: String, enum: ['usuario', 'agente'], required: true },
        contenido: { type: String, required: true },
        audioUrl: String,
        timestamp: { type: Date, default: Date.now },
      },
    ],
    modeloUsado: { type: String, default: 'claude-haiku' },
    tokensUsados: { type: Number, default: 0 },
    cerrada: { type: Boolean, default: false },
  },
  { timestamps: true }
);

ConversacionAgenteSchema.index({ entrenadorId: 1, clienteId: 1, updatedAt: -1 });

export const ConversacionAgente = model<IConversacionAgente>('ConversacionAgente', ConversacionAgenteSchema);
