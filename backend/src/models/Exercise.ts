import { Schema, model, Document, Types } from 'mongoose';

export type MuscleGroup =
  | 'pecho'
  | 'espalda'
  | 'piernas'
  | 'hombros'
  | 'brazos'
  | 'core'
  | 'cardio'
  | 'full_body';

export interface IExercise extends Document {
  name: string;
  muscleGroup: MuscleGroup;
  videoUrl: string;
  videoPublicId: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  instructions?: string;
  createdBy: Types.ObjectId;
  isTemplate: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ExerciseSchema = new Schema<IExercise>(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    muscleGroup: {
      type: String,
      enum: ['pecho', 'espalda', 'piernas', 'hombros', 'brazos', 'core', 'cardio', 'full_body'],
      required: true,
      index: true,
    },
    videoUrl: { type: String, required: true },
    videoPublicId: { type: String, required: true, select: false },
    thumbnailUrl: String,
    durationSeconds: Number,
    instructions: { type: String, maxlength: 1000 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'Entrenador', required: true, index: true },
    isTemplate: { type: Boolean, default: true },
  },
  { timestamps: true }
);

ExerciseSchema.index({ createdBy: 1, name: 1 });

export const Exercise = model<IExercise>('Exercise', ExerciseSchema);

export interface IRoutineDayExercise {
  exercise: Types.ObjectId;
  sets: number;
  reps: string;
  restSeconds: number;
  notes?: string;
}

export interface IRoutine extends Document {
  clienteId: Types.ObjectId;
  entrenadorId: Types.ObjectId;
  title: string;
  days: Array<{
    dayLabel: string;
    exercises: IRoutineDayExercise[];
  }>;
  startDate: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RoutineSchema = new Schema<IRoutine>(
  {
    clienteId: { type: Schema.Types.ObjectId, ref: 'Cliente', required: true, index: true },
    entrenadorId: { type: Schema.Types.ObjectId, ref: 'Entrenador', required: true, index: true },
    title: { type: String, required: true, maxlength: 200 },
    days: [
      {
        dayLabel: { type: String, required: true },
        exercises: [
          {
            exercise: { type: Schema.Types.ObjectId, ref: 'Exercise', required: true },
            sets: { type: Number, required: true, min: 1 },
            reps: { type: String, required: true },
            restSeconds: { type: Number, default: 60 },
            notes: { type: String, maxlength: 300 },
          },
        ],
      },
    ],
    startDate: { type: Date, required: true, default: Date.now },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

RoutineSchema.index({ clienteId: 1, isActive: 1 });

export const Routine = model<IRoutine>('Routine', RoutineSchema);
