import { Schema, model, Document, Types } from 'mongoose';
import type { ProtocolStatus } from '../theme/canelaCoach.tokens.js';

const MealSchema = new Schema(
  {
    meal1: String,
    meal2: String,
    meal3: String,
  },
  { _id: false }
);

export interface IProtocol extends Document {
  clienteId: Types.ObjectId;
  entrenadorId: Types.ObjectId;
  version: number;
  status: ProtocolStatus;
  objective: {
    initialWeightLb?: number | null;
    currentWeightLb?: number | null;
    goals: string[];
  };
  weeklyMenu: {
    patternDayMap: Map<string, string> | Record<string, string>;
    mealPatternA?: { meal1?: string; meal2?: string; meal3?: string };
    mealPatternB?: { meal1?: string; meal2?: string; meal3?: string };
    snacksOptional?: string[];
  };
  supplementation: Array<{
    catalogSku?: string | null;
    productLabel?: string;
    dose?: string;
    instruction?: string;
    timesPerDay?: number;
  }>;
  biohacking: { yes: string[]; no: string[] };
  createdBy: Types.ObjectId;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const ProtocolSchema = new Schema<IProtocol>(
  {
    clienteId: { type: Schema.Types.ObjectId, ref: 'Cliente', required: true, index: true },
    entrenadorId: { type: Schema.Types.ObjectId, ref: 'Entrenador', required: true, index: true },
    version: { type: Number, default: 1 },
    status: {
      type: String,
      enum: ['draft', 'active', 'archived'],
      default: 'draft',
      index: true,
    },
    objective: {
      initialWeightLb: { type: Number, default: null },
      currentWeightLb: { type: Number, default: null },
      goals: [String],
    },
    weeklyMenu: {
      patternDayMap: { type: Map, of: String, default: {} },
      mealPatternA: MealSchema,
      mealPatternB: MealSchema,
      snacksOptional: [String],
    },
    supplementation: [
      {
        catalogSku: { type: String, default: null },
        productLabel: String,
        dose: String,
        instruction: String,
        timesPerDay: Number,
      },
    ],
    biohacking: {
      yes: [String],
      no: [String],
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'Entrenador', required: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

ProtocolSchema.index({ clienteId: 1, version: -1 });
ProtocolSchema.index({ clienteId: 1, status: 1 });

export const Protocol = model<IProtocol>('Protocol', ProtocolSchema);
