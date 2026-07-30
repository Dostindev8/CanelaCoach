import argon2 from 'argon2';
import { env } from './config/env.js';
import { Entrenador } from './models/Entrenador.js';
import { Cliente } from './models/Cliente.js';
import { Evaluacion } from './models/Evaluacion.js';
import { calcularRatios } from './services/calculos.js';

/** Idempotent seed — only runs if no entrenadores exist */
export async function ensureSeedData(): Promise<void> {
  const count = await Entrenador.countDocuments();
  if (count > 0) return;

  console.log('[seed] base vacía → creando datos de demostración…');

  const adminHash = await argon2.hash(env.seed.adminPassword, { type: argon2.argon2id });
  const coachHash = await argon2.hash(env.seed.entrenadorPassword, { type: argon2.argon2id });

  await Entrenador.create({
    nombre: 'Admin Canela',
    email: env.seed.adminEmail,
    passwordHash: adminHash,
    rol: 'admin',
    mfaObligatorio: env.nodeEnv === 'production',
    mfaHabilitado: false,
  });

  const coach = await Entrenador.create({
    nombre: 'Abraham Canela',
    email: env.seed.entrenadorEmail,
    passwordHash: coachHash,
    rol: 'entrenador',
  });

  const clientesData = [
    {
      nombre: 'María Pérez',
      edad: 28,
      sexo: 'Femenino' as const,
      ocupacion: 'Diseñadora',
      nivelActividad: 'Moderado' as const,
      objetivo: 'Reducir grasa corporal y tonificar',
      email: 'maria.perez@example.com',
      telefono: '+18095550101',
      antecedentes: {
        enfermedades: 'Ninguna conocida',
        cirugias: 'Ninguna',
        lesiones: 'Esguince tobillo 2023',
        medicamentos: 'Ninguno',
        alergias: 'Polen',
      },
      habitos: { calidadSueno: 3, nivelEstres: 4, consumoAgua: '1.5L', alcohol: 'Ocasional', tabaco: 'No' },
    },
    {
      nombre: 'José Rodríguez',
      edad: 35,
      sexo: 'Masculino' as const,
      ocupacion: 'Ingeniero',
      nivelActividad: 'Sedentario' as const,
      objetivo: 'Ganar masa muscular',
      email: 'jose.rodriguez@example.com',
      antecedentes: {
        enfermedades: 'Hipertensión controlada',
        cirugias: 'Apendicectomía 2015',
        lesiones: 'Ninguna',
        medicamentos: 'Losartán 50mg',
        alergias: 'Ninguna',
      },
      habitos: { calidadSueno: 2, nivelEstres: 5, consumoAgua: '1L', alcohol: 'Fines de semana', tabaco: 'No' },
    },
    {
      nombre: 'Ana Gómez',
      edad: 42,
      sexo: 'Femenino' as const,
      ocupacion: 'Docente',
      nivelActividad: 'Activo' as const,
      objetivo: 'Mejorar resistencia y postura',
      email: 'ana.gomez@example.com',
      antecedentes: {
        enfermedades: 'Ninguna',
        cirugias: 'Cesárea 2018',
        lesiones: 'Lumbalgia leve',
        medicamentos: 'Ninguno',
        alergias: 'Mariscos',
      },
      habitos: { calidadSueno: 4, nivelEstres: 3, consumoAgua: '2L', alcohol: 'No', tabaco: 'No' },
    },
  ];

  const clientes = [];
  for (const c of clientesData) {
    clientes.push(await Cliente.create({ ...c, entrenadorId: coach._id }));
  }

  const mariaAnt1 = { peso: 72, estatura: 1.65, cintura: 82, gluteos: 98, cuello: 34, torax: 92, biceps: 28 };
  const mariaAnt2 = { peso: 68.5, estatura: 1.65, cintura: 76, gluteos: 96, cuello: 33, torax: 90, biceps: 29 };

  await Evaluacion.create({
    clienteId: clientes[0]._id,
    entrenadorId: coach._id,
    fecha: new Date(Date.now() - 45 * 86400000),
    tipo: 'inicial',
    antropometria: { ...mariaAnt1, ...calcularRatios(mariaAnt1) },
    composicionCorporal: { grasaCorporalPct: 32, masaMuscular: 42, aguaCorporalPct: 48, grasaVisceral: 9 },
    diagnostico: { resumen: 'Sobrepeso con buen potencial de recomposición.' },
    planAccion: {
      focoPrincipal: 'Déficit calórico moderado + fuerza',
      items: ['3x fuerza/semana', 'Cardio 2x', 'Proteína 1.6g/kg'],
    },
  });

  await Evaluacion.create({
    clienteId: clientes[0]._id,
    entrenadorId: coach._id,
    fecha: new Date(),
    tipo: 'seguimiento',
    antropometria: { ...mariaAnt2, ...calcularRatios(mariaAnt2) },
    composicionCorporal: { grasaCorporalPct: 28.5, masaMuscular: 43.5, aguaCorporalPct: 50, grasaVisceral: 7 },
    diagnostico: { resumen: 'Progreso sólido: -3.5kg y -3.5% grasa.' },
    planAccion: {
      focoPrincipal: 'Mantener déficit y subir cargas',
      items: ['Progresión en sentadilla', 'HIIT 1x', 'Sueño 7h'],
    },
  });

  const joseAnt = { peso: 85, estatura: 1.78, cintura: 94, gluteos: 100, cuello: 40 };
  await Evaluacion.create({
    clienteId: clientes[1]._id,
    entrenadorId: coach._id,
    fecha: new Date(Date.now() - 40 * 86400000),
    tipo: 'inicial',
    antropometria: { ...joseAnt, ...calcularRatios(joseAnt) },
    composicionCorporal: { grasaCorporalPct: 26, masaMuscular: 55, aguaCorporalPct: 52, grasaVisceral: 11 },
    planAccion: { focoPrincipal: 'Hipertrofia full body', items: ['4x gym', 'Superávit +250kcal'] },
  });

  console.log(`[seed] listo → entrenador demo creado: ${env.seed.entrenadorEmail}`);
}

/** Keeps demo coach name aligned on existing databases. */
export async function syncDemoCoachProfile(): Promise<void> {
  await Entrenador.updateOne(
    { email: env.seed.entrenadorEmail.toLowerCase() },
    { $set: { nombre: 'Abraham Canela' } }
  );
}

/**
 * Ensures admin can always sign in locally: sync password from SEED_*,
 * clear MFA gate outside production, keep rol/activo.
 */
export async function ensureAdminAccess(): Promise<void> {
  const email = env.seed.adminEmail.toLowerCase();
  const passwordHash = await argon2.hash(env.seed.adminPassword, { type: argon2.argon2id });
  const existing = await Entrenador.findOne({ email }).select('_id');

  if (!existing) {
    await Entrenador.create({
      nombre: 'Admin Canela',
      email,
      passwordHash,
      rol: 'admin',
      mfaObligatorio: env.nodeEnv === 'production',
      mfaHabilitado: false,
      activo: true,
    });
    console.log(`[seed] admin creado → ${email}`);
    return;
  }

  const $set: Record<string, unknown> = {
    rol: 'admin',
    activo: true,
    nombre: 'Admin Canela',
    limiteClientes: 10_000,
  };

  if (env.nodeEnv === 'production') {
    $set.mfaObligatorio = true;
  } else {
    $set.mfaObligatorio = false;
    $set.passwordHash = passwordHash;
  }

  await Entrenador.updateOne({ _id: existing._id }, { $set });
  if (env.nodeEnv !== 'production') {
    console.log(`[seed] admin listo (sin MFA obligatorio en ${env.nodeEnv}) → ${email}`);
  }
}
