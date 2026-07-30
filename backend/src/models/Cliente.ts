import { Schema, model, Document, Types } from 'mongoose';
import { cifrarAntecedentes, descifrarAntecedentes } from '../utils/campoCifrado.js';

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
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

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
  },
  { timestamps: true }
);

ClienteSchema.index({ entrenadorId: 1, nombre: 1 });
ClienteSchema.index({ entrenadorId: 1, activo: 1 });

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
  return obj;
}

export const Cliente = model<ICliente>('Cliente', ClienteSchema);
