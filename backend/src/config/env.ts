import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function readKey(envPath?: string): string {
  if (!envPath) return '';
  const resolved = path.isAbsolute(envPath)
    ? envPath
    : path.resolve(__dirname, '../..', envPath);
  if (fs.existsSync(resolved)) return fs.readFileSync(resolved, 'utf8');
  // Allow inline PEM content
  if (envPath.includes('BEGIN')) return envPath.replace(/\\n/g, '\n');
  return '';
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4000),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/canela-coach',
  // Development stays usable offline; production never falls back to volatile storage.
  mongoMemoryFallback:
    process.env.NODE_ENV !== 'production' && process.env.MONGODB_MEMORY_FALLBACK !== 'false',
  /** Skip Atlas/local URI and boot Memory Server immediately (dev only). */
  useMemoryMongo:
    process.env.NODE_ENV !== 'production' && process.env.USE_MEMORY_MONGO === 'true',
  redisUrl: process.env.REDIS_URL || '',
  jwtPrivateKey: readKey(process.env.JWT_PRIVATE_KEY_PATH) || process.env.JWT_PRIVATE_KEY || '',
  jwtPublicKey: readKey(process.env.JWT_PUBLIC_KEY_PATH) || process.env.JWT_PUBLIC_KEY || '',
  jwtAccessTtl: process.env.JWT_ACCESS_TTL || '15m',
  jwtRefreshTtl: process.env.JWT_REFRESH_TTL || '7d',
  /** Parallel client portal JWT — never reuse trainer access_token cookie. */
  clientJwtSecret: process.env.CLIENT_JWT_SECRET || '',
  clientJwtTtl: process.env.CLIENT_JWT_TTL || '7d',
  fieldEncryptionKey: process.env.FIELD_ENCRYPTION_KEY || '',
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  },
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'Canela Coach <noreply@canelacoach.com>',
  },
  whatsapp: {
    token: process.env.WHATSAPP_TOKEN || '',
    phoneId: process.env.WHATSAPP_PHONE_ID || '',
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    modelDefault: process.env.ANTHROPIC_MODEL_DEFAULT || 'claude-3-5-haiku-20241022',
    modelEscalado: process.env.ANTHROPIC_MODEL_ESCALADO || 'claude-3-5-sonnet-20241022',
  },
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  sentryDsn: process.env.SENTRY_DSN || '',
  seed: {
    adminEmail: process.env.SEED_ADMIN_EMAIL || 'admin@canelacoach.com',
    adminPassword: process.env.SEED_ADMIN_PASSWORD || 'CanelaAdmin2026!',
    entrenadorEmail: process.env.SEED_ENTRENADOR_EMAIL || 'entrenador@canelacoach.com',
    entrenadorPassword: process.env.SEED_ENTRENADOR_PASSWORD || 'CanelaCoach2026!',
  },
};

export function assertCriticalEnv(): void {
  if (env.nodeEnv === 'production') {
    if (!env.fieldEncryptionKey || env.fieldEncryptionKey.length !== 64) {
      throw new Error(
        '[config] FIELD_ENCRYPTION_KEY debe ser 64 hex chars (32 bytes) en producción. Abortando.'
      );
    }
    if (!env.mongodbUri || env.mongodbUri.includes('127.0.0.1') || env.mongodbUri.includes('localhost')) {
      console.warn('[config] MONGODB_URI parece local en producción — verifica Atlas.');
    }
    // Block shipping with known demo seed passwords if someone forgets to override
    const weakSeeds = ['CanelaAdmin2026!', 'CanelaCoach2026!'];
    if (
      weakSeeds.includes(env.seed.adminPassword) ||
      weakSeeds.includes(env.seed.entrenadorPassword)
    ) {
      console.warn(
        '[config] SEED_*_PASSWORD usa valores demo. Cámbialos en producción (SEED_ADMIN_PASSWORD / SEED_ENTRENADOR_PASSWORD).'
      );
    }
    if (!env.clientJwtSecret || env.clientJwtSecret.length < 32) {
      throw new Error(
        '[config] CLIENT_JWT_SECRET (≥32 chars) obligatorio en producción para el portal cliente.'
      );
    }
  } else if (!env.fieldEncryptionKey || env.fieldEncryptionKey.length !== 64) {
    console.warn(
      '[config] FIELD_ENCRYPTION_KEY debe ser 64 hex chars (32 bytes). Generando temporal para desarrollo.'
    );
  }
  if (!env.jwtPrivateKey || !env.jwtPublicKey) {
    throw new Error('JWT RSA keys no encontradas. Ejecuta generación de keys en backend/keys/');
  }
}
