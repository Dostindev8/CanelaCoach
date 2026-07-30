import { connectMongo } from './config/mongo.js';
import { Entrenador } from './models/Entrenador.js';
import { Cliente } from './models/Cliente.js';
import { Evaluacion } from './models/Evaluacion.js';
import { ensureSeedData } from './seedData.js';
import { env } from './config/env.js';

async function seed() {
  await connectMongo();
  console.log('[seed] iniciando (force reset)…');

  await Promise.all([Evaluacion.deleteMany({}), Cliente.deleteMany({}), Entrenador.deleteMany({})]);
  await ensureSeedData();

  console.log('═══════════════════════════════════════════');
  console.log('  CANELA COACH® — SEED COMPLETADO');
  console.log('═══════════════════════════════════════════');
  console.log(`  Admin:       ${env.seed.adminEmail}`);
  console.log(`  Entrenador:  ${env.seed.entrenadorEmail}`);
  console.log('  Credenciales: revisa únicamente las variables locales SEED_*');
  console.log(`  Nota MFA:    Admin debe activar TOTP en primer login`);
  console.log('═══════════════════════════════════════════');
  process.exit(0);
}

seed().catch((err) => {
  console.error('[seed] error', err);
  process.exit(1);
});
