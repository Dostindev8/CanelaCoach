import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { env } from './env.js';

let memoryServer: MongoMemoryServer | null = null;
let databaseReady = false;

const MAX_PRODUCTION_RETRY_DELAY_MS = 30_000;
const LOCAL_RETRY_ATTEMPTS = 1;

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function safeMongoError(err: unknown): string {
  const message = err instanceof Error ? err.message : 'error desconocido';
  // Avoid leaking credentials or a connection string through deployment logs.
  return message.replace(/mongodb(?:\+srv)?:\/\/[^@\s]+@/gi, 'mongodb://***@');
}

export function isDatabaseReady(): boolean {
  return databaseReady;
}

export async function connectMongo(): Promise<typeof mongoose> {
  mongoose.set('strictQuery', true);

  if (env.useMemoryMongo) {
    console.warn('[mongo] USE_MEMORY_MONGO=true → Memory Server (sin Atlas)');
    memoryServer = await MongoMemoryServer.create();
    const conn = await mongoose.connect(memoryServer.getUri(), {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5_000,
    });
    databaseReady = true;
    console.log('[mongo] Memory Server listo (datos volátiles — se pierden al reiniciar)');
    return conn;
  }

  for (let attempt = 1; ; attempt += 1) {
    try {
      const conn = await mongoose.connect(env.mongodbUri, {
        maxPoolSize: 20,
        minPoolSize: env.nodeEnv === 'production' ? 2 : 0,
        // Fail fast in local so memory fallback can start when Atlas ACL blocks TLS.
        serverSelectionTimeoutMS: env.mongoMemoryFallback ? 5_000 : 12_000,
        connectTimeoutMS: env.mongoMemoryFallback ? 5_000 : 12_000,
        socketTimeoutMS: 45_000,
        // Atlas Network Access often lists IPv4 only; dual-stack hosts fail on IPv6 first.
        family: 4,
      });
      databaseReady = true;
      console.log(`[mongo] conectado → ${conn.connection.host}/${conn.connection.name}`);
      return conn;
    } catch (err) {
      databaseReady = false;
      const canUseMemoryFallback =
        env.nodeEnv !== 'production' &&
        env.mongoMemoryFallback &&
        attempt >= LOCAL_RETRY_ATTEMPTS;

      if (canUseMemoryFallback) {
        console.warn('[mongo] Atlas/local no disponible; iniciando fallback temporal de desarrollo.');
        try {
          memoryServer = await MongoMemoryServer.create();
          const conn = await mongoose.connect(memoryServer.getUri(), {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5_000,
          });
          databaseReady = true;
          console.log('[mongo] Memory Server listo (datos volátiles — se pierden al reiniciar)');
          return conn;
        } catch (memErr) {
          console.error('[mongo] Memory Server falló:', safeMongoError(memErr));
          throw memErr;
        }
      }

      const retryDelay = Math.min(1_000 * 2 ** (attempt - 1), MAX_PRODUCTION_RETRY_DELAY_MS);
      console.warn(
        `[mongo] conexión no disponible (intento ${attempt}); reintento en ${Math.ceil(retryDelay / 1_000)}s: ${safeMongoError(err)}`
      );
      await wait(retryDelay);
    }
  }
}

export async function stopMemoryMongo(): Promise<void> {
  databaseReady = false;
  if (memoryServer) {
    await mongoose.disconnect();
    await memoryServer.stop();
    memoryServer = null;
  }
}
