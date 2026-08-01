import { z } from 'zod';
import { AppError } from '../middlewares/errorHandler.js';

export const registroSchema = z.object({
  nombre: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(10).max(128),
  rol: z.enum(['admin', 'entrenador']).default('entrenador'),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  totpCode: z.string().length(6).optional(),
});

export const mfaVerificarSchema = z.object({
  code: z.string().length(6),
});

export const clienteSchema = z.object({
  nombre: z.string().min(2).max(120),
  edad: z.number().int().min(1).max(120),
  sexo: z.enum(['Masculino', 'Femenino']),
  ocupacion: z.string().max(120).optional(),
  estadoCivil: z.string().max(60).optional(),
  nivelActividad: z.enum(['Sedentario', 'Moderado', 'Activo', 'Muy activo']).optional(),
  tiempoDisponible: z.string().max(60).optional(),
  objetivo: z.string().max(500).optional(),
  email: z.string().email().optional().or(z.literal('')),
  telefono: z.string().max(30).optional(),
  fotoPerfilUrl: z.string().url().optional().or(z.literal('')),
  fechaNacimiento: z.coerce.date().optional(),
  direccion: z.string().max(300).optional(),
  profesion: z.string().max(120).optional(),
  pesoInicial: z.number().min(25).max(400).optional(),
  estaturaInicial: z.number().min(1).max(2.5).optional(),
  fotografiasIniciales: z.array(z.string().url()).max(12).optional(),
  antecedentesFamiliares: z.string().max(2000).optional(),
  suplementos: z.string().max(2000).optional(),
  horariosComida: z.string().max(500).optional(),
  alimentosConsume: z.string().max(2000).optional(),
  alimentosNoLeGustan: z.string().max(2000).optional(),
  antecedentes: z
    .object({
      enfermedades: z.string().max(2000).optional(),
      cirugias: z.string().max(2000).optional(),
      lesiones: z.string().max(2000).optional(),
      medicamentos: z.string().max(2000).optional(),
      alergias: z.string().max(2000).optional(),
    })
    .optional(),
  habitos: z
    .object({
      calidadSueno: z.number().int().min(1).max(5).optional(),
      nivelEstres: z.number().int().min(1).max(5).optional(),
      consumoAgua: z.string().max(60).optional(),
      alcohol: z.string().max(60).optional(),
      tabaco: z.string().max(60).optional(),
    })
    .optional(),
});

const cm = z.number().min(10).max(250).optional();
const pliegueMm = z.number().min(1).max(80).optional();
const diametroCm = z.number().min(2).max(25).optional();

export const evaluacionSchema = z.object({
  fecha: z.coerce.date().optional(),
  tipo: z.enum(['inicial', 'seguimiento']).optional(),
  antropometria: z
    .object({
      peso: z.number().min(25).max(400).optional(), // kg
      estatura: z.number().min(1.0).max(250).optional(), // meters or cm (engine normalizes)
      cuello: cm,
      torax: cm,
      hombros: cm,
      pecho: cm,
      biceps: cm,
      brazoDerecho: cm,
      brazoIzquierdo: cm,
      antebrazo: cm,
      cintura: cm,
      abdomen: cm,
      cadera: cm,
      gluteos: cm,
      cuadriceps: cm,
      musloDerecho: cm,
      musloIzquierdo: cm,
      pantorrilla: cm,
      presionArterial: z.string().max(20).optional(),
      frecuenciaCardiaca: z.number().int().min(30).max(220).optional(),
    })
    .optional(),
  pliegues: z
    .object({
      tricipital: pliegueMm,
      pectoral: pliegueMm,
      escapular: pliegueMm,
      abdominal: pliegueMm,
      suprailiaco: pliegueMm,
      muslo: pliegueMm,
      pantorrilla: pliegueMm,
    })
    .optional(),
  diametrosOseos: z
    .object({
      codo: diametroCm,
      rodilla: diametroCm,
      muneca: diametroCm,
    })
    .optional(),
  composicionCorporal: z
    .object({
      grasaCorporalPct: z.number().min(0).max(70).optional(),
      grasaCorporalLb: z.number().min(0).optional(),
      masaMagra: z.number().min(0).optional(),
      masaMuscular: z.number().min(0).optional(),
      aguaCorporalPct: z.number().min(0).max(100).optional(),
      grasaVisceral: z.number().min(0).optional(),
    })
    .optional(),
  pesoObjetivoEditable: z.number().min(30).max(300).optional().nullable(),
  objetivosProximoMes: z.string().max(5000).optional(),
  weightLb: z.number().min(50).max(800).optional().nullable(),
  observacionesDesdeUltima: z.string().max(5000).optional().nullable(),
  smartScale: z
    .object({
      capturedAt: z.coerce.date().optional().nullable(),
      status: z.enum(['Bajo', 'Saludable', 'Alto', 'Obeso']).optional().nullable(),
      weightKg: z.number().min(25).max(400).optional().nullable(),
      bmi: z.number().min(10).max(80).optional().nullable(),
      bodyFatPercent: z.number().min(0).max(75).optional().nullable(),
      fatMassKg: z.number().min(0).optional().nullable(),
      skeletalMuscleMassPercent: z.number().min(0).max(100).optional().nullable(),
      skeletalMuscleMassKg: z.number().min(0).optional().nullable(),
      musclePercent: z.number().min(0).max(100).optional().nullable(),
      muscleMassKg: z.number().min(0).optional().nullable(),
      waterPercent: z.number().min(0).max(100).optional().nullable(),
      waterMassKg: z.number().min(0).optional().nullable(),
      visceralFat: z.number().min(0).optional().nullable(),
      metabolismKcalDay: z.number().min(500).max(5000).optional().nullable(),
      heightCmDevice: z.number().min(100).max(250).optional().nullable(),
      ageDeviceEstimate: z.number().int().min(1).max(120).optional().nullable(),
    })
    .optional(),
  evaluacionPostural: z.record(z.string()).optional(),
  evaluacionFuncional: z.record(z.string()).optional(),
  condicionFisica: z.record(z.union([z.string(), z.number()])).optional(),
  fotografias: z
    .object({
      frenteUrl: z.string().optional(),
      perfilDerechoUrl: z.string().optional(),
      espaldaUrl: z.string().optional(),
    })
    .optional(),
  diagnostico: z
    .object({
      composicionCorporalTexto: z.string().max(5000).optional(),
      condicionFisicaTexto: z.string().max(5000).optional(),
      habitosTexto: z.string().max(5000).optional(),
      potencial: z.string().max(2000).optional(),
      resumen: z.string().max(5000).optional(),
    })
    .optional(),
  planAccion: z
    .object({
      items: z.array(z.string().max(500)).optional(),
      focoPrincipal: z.string().max(500).optional(),
    })
    .optional(),
  notasEntrenador: z.string().max(5000).optional(),
  puntosAMejorar: z.array(z.string().max(500)).max(20).optional(),
});

export const planSchema = z.object({
  tipo: z.enum(['dieta', 'rutina', 'suplementacion', 'protocolo', 'recomendacion']),
  nombre: z.string().min(2).max(200),
  contenido: z.string().min(1).max(50000),
  tags: z.array(z.string().max(40)).max(20).optional(),
  activo: z.boolean().optional(),
});

export const planAsignacionSchema = z.object({
  planId: z.string().min(1),
  clienteId: z.string().min(1),
  notas: z.string().max(2000).optional(),
});

export const citaSchema = z.object({
  clienteId: z.string().min(1),
  fecha: z.coerce.date(),
  notas: z.string().max(2000).optional(),
  estado: z.enum(['programada', 'completada', 'cancelada']).optional(),
});

export const pacienteLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const pacienteCuentaCreateSchema = z.object({
  clienteId: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(10).max(128),
});

export const cuestionarioIngresoSchema = z.object({
  datosPersonales: z
    .object({
      ocupacion: z.string().max(120).optional(),
      telefono: z.string().max(30).optional(),
      contactoEmergenciaNombre: z.string().max(120).optional(),
      contactoEmergenciaTelefono: z.string().max(30).optional(),
    })
    .optional(),
  objetivoPrincipal: z
    .enum([
      'pérdida de grasa',
      'ganancia muscular',
      'tonificación',
      'salud general',
      'preparación deportiva',
      'otro',
    ])
    .optional(),
  objetivoDetalle: z.string().max(1000).optional(),
  historialMedico: z
    .object({
      condicionesDiagnosticadas: z.array(z.string().max(120)).max(30).optional(),
      medicamentosActuales: z.string().max(2000).optional(),
      cirugiasLesiones: z.string().max(2000).optional(),
      restriccionesFisicas: z.string().max(2000).optional(),
      autorizacionMedica: z.boolean().optional(),
    })
    .optional(),
  historialActividadFisica: z
    .object({
      entrenoAntes: z.boolean().optional(),
      tiempoEntrenando: z.string().max(120).optional(),
      actividadActual: z.string().max(500).optional(),
      nivelActividad: z.enum(['sedentario', 'ligero', 'moderado', 'activo', 'muy activo']).optional(),
    })
    .optional(),
  nutricion: z
    .object({
      dietaActual: z.string().max(1000).optional(),
      alergiasIntolerancias: z.string().max(1000).optional(),
      comidasPorDia: z.number().int().min(1).max(12).optional(),
      consumoAguaLitros: z.number().min(0).max(20).optional(),
    })
    .optional(),
  estiloDeVida: z
    .object({
      horasSueno: z.number().min(0).max(24).optional(),
      nivelEstres: z.enum(['bajo', 'moderado', 'alto']).optional(),
      consumoAlcohol: z.enum(['nunca', 'ocasional', 'frecuente']).optional(),
      consumoTabaco: z.boolean().optional(),
      ocupacionSedentaria: z.boolean().optional(),
    })
    .optional(),
  disponibilidad: z
    .object({
      diasDisponibles: z.array(z.string().max(20)).max(7).optional(),
      horarioPreferido: z.string().max(120).optional(),
      accesoGimnasio: z.boolean().optional(),
      equipoDisponible: z.string().max(500).optional(),
    })
    .optional(),
  consentimientoInformado: z
    .object({
      aceptaTerminos: z.boolean().optional(),
      aceptaEvaluacionesFisicas: z.boolean().optional(),
      firmaDigital: z.string().max(200).optional(),
      fechaConsentimiento: z.coerce.date().optional(),
    })
    .optional(),
});

export const agenteMensajeSchema = z.object({
  mensaje: z.string().min(1).max(4000),
  clienteId: z.string().optional(),
  conversacionId: z.string().optional(),
});

const mealSchema = z.object({
  meal1: z.string().max(500).optional(),
  meal2: z.string().max(500).optional(),
  meal3: z.string().max(500).optional(),
});

export const protocolSchema = z.object({
  objective: z
    .object({
      initialWeightLb: z.number().min(50).max(800).optional().nullable(),
      currentWeightLb: z.number().min(50).max(800).optional().nullable(),
      goals: z.array(z.string().max(200)).max(20).optional(),
    })
    .optional(),
  weeklyMenu: z
    .object({
      patternDayMap: z.record(z.enum(['A', 'B'])).optional(),
      mealPatternA: mealSchema.optional(),
      mealPatternB: mealSchema.optional(),
      snacksOptional: z.array(z.string().max(200)).max(20).optional(),
    })
    .optional(),
  supplementation: z
    .array(
      z.object({
        catalogSku: z.string().max(80).optional().nullable(),
        productLabel: z.string().max(200).optional(),
        dose: z.string().max(120).optional(),
        instruction: z.string().max(500).optional(),
        timesPerDay: z.number().int().min(1).max(12).optional(),
      })
    )
    .max(30)
    .optional(),
  biohacking: z
    .object({
      yes: z.array(z.string().max(500)).max(40).optional(),
      no: z.array(z.string().max(500)).max(40).optional(),
    })
    .optional(),
  updatedAt: z.coerce.date().optional(), // optimistic concurrency
});

export const supplementCatalogSchema = z.object({
  sku: z.string().min(2).max(80),
  name: z.string().min(2).max(200),
  brand: z.string().max(120).optional(),
  benefits: z.array(z.string().max(200)).max(40).optional(),
  usage: z.string().max(1000).optional(),
  indications: z.array(z.string().max(200)).max(40).optional(),
  ingredients: z.string().max(5000).optional(),
  flavor: z.string().max(120).optional(),
  netWeight: z.string().max(80).optional(),
  netContent: z.string().max(80).optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
  active: z.boolean().optional(),
});

export const pagoClienteSchema = z.object({
  amount: z.number().min(0),
  currency: z.enum(['DOP', 'USD']).default('DOP'),
  paidAt: z.coerce.date().optional(),
  method: z.enum(['cash', 'transfer', 'card', 'other']),
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
  notes: z.string().max(500).optional(),
});

export const membershipPatchSchema = z.object({
  membershipStatus: z.enum(['active', 'inactive', 'paused', 'cancelled']).optional(),
  currentPeriodEnd: z.coerce.date().optional(),
  gracePeriodDays: z.number().int().min(0).max(60).optional(),
  nextEvaluationDate: z.coerce.date().nullable().optional(),
  evaluationFrequencyDays: z.number().int().min(7).max(365).optional(),
});

export const pacienteRegisterSchema = z.object({
  fullName: z.string().min(2).max(120).optional(),
  email: z.string().email(),
  phone: z.string().min(8).max(30),
  password: z.string().min(8).max(128),
  invitationCode: z.string().min(4).max(32),
  clienteId: z.string().optional(),
});

export const exerciseSchema = z.object({
  name: z.string().min(2).max(160),
  muscleGroup: z.enum([
    'pecho',
    'espalda',
    'piernas',
    'hombros',
    'brazos',
    'core',
    'cardio',
    'full_body',
  ]),
  videoUrl: z.string().url(),
  videoPublicId: z.string().min(1).max(300),
  thumbnailUrl: z.string().url().optional().or(z.literal('')),
  durationSeconds: z.number().int().min(1).max(7200).optional(),
  instructions: z.string().max(1000).optional(),
  isTemplate: z.boolean().optional(),
});

export const routineSchema = z.object({
  clienteId: z.string().min(1),
  title: z.string().min(2).max(200),
  startDate: z.coerce.date().optional(),
  isActive: z.boolean().optional(),
  days: z
    .array(
      z.object({
        dayLabel: z.string().min(1).max(120),
        exercises: z
          .array(
            z.object({
              exerciseId: z.string().min(1),
              sets: z.number().int().min(1).max(50),
              reps: z.string().min(1).max(40),
              restSeconds: z.number().int().min(0).max(600).optional(),
              notes: z.string().max(300).optional(),
            })
          )
          .min(1)
          .max(40),
      })
    )
    .min(1)
    .max(14),
});

export function parseBody<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new AppError('Validación fallida', 400, 'VALIDATION', result.error.flatten());
  }
  return result.data;
}
