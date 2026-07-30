import rateLimit from 'express-rate-limit';
import { Request } from 'express';
import { getCache } from '../config/redis.js';
import { env } from '../config/env.js';

function ipKey(req: { ip?: string }): string {
  return req.ip || 'unknown';
}

const isDev = env.nodeEnv !== 'production';

export const globalRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: isDev ? 5000 : 120,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKey(req),
  skip: (req: Request) =>
    isDev || req.path === '/api/health' || req.path === '/health',
  message: {
    ok: false,
    error: {
      message: 'Demasiadas solicitudes. Espera un momento e intenta de nuevo.',
      code: 'RATE_LIMIT',
    },
  },
});

export const authRateLimit = rateLimit({
  windowMs: 60 * 1000,
  // Dev: unlimited for QA/delivery. Prod: 10/min + lockout progressive.
  max: isDev ? 1000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKey(req),
  skip: () => isDev,
  message: {
    ok: false,
    error: {
      message: 'Demasiados intentos de login. Espera 1 minuto e intenta de nuevo.',
      code: 'RATE_LIMIT',
    },
  },
});

export const agenteRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: isDev ? 200 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `agente:${(req as { entrenadorId?: string }).entrenadorId || req.ip}`,
  message: { ok: false, error: { message: 'Límite de mensajes del agente (20/min)', code: 'RATE_LIMIT' } },
});

/** PDF generation is expensive — 10/min per coach IP */
export const pdfExportRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: isDev ? 100 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `pdf:${(req as { entrenadorId?: string }).entrenadorId || req.ip}`,
  message: {
    ok: false,
    error: { message: 'Límite de exportación PDF (10/min). Espera un momento.', code: 'RATE_LIMIT' },
  },
});

/** Progressive lockout: 5 fails → 5min, 10 → 1h */
export async function registrarFalloLogin(
  email: string,
  ip: string
): Promise<{ bloqueado: boolean; hasta?: Date; intentos: number }> {
  const key = `lockout:${email.toLowerCase()}:${ip}`;
  const cache = getCache();
  const intentos = await cache.incr(key);
  if (intentos === 1) await cache.expire(key, 3600);

  if (intentos >= 10) {
    const hasta = new Date(Date.now() + 60 * 60 * 1000);
    await cache.set(`blocked:${email.toLowerCase()}`, hasta.toISOString(), 'EX', 3600);
    return { bloqueado: true, hasta, intentos };
  }
  if (intentos >= 5) {
    const hasta = new Date(Date.now() + 5 * 60 * 1000);
    await cache.set(`blocked:${email.toLowerCase()}`, hasta.toISOString(), 'EX', 300);
    return { bloqueado: true, hasta, intentos };
  }
  return { bloqueado: false, intentos };
}

export async function estaBloqueado(email: string): Promise<Date | null> {
  const raw = await getCache().get(`blocked:${email.toLowerCase()}`);
  if (!raw) return null;
  const hasta = new Date(raw);
  if (hasta.getTime() > Date.now()) return hasta;
  return null;
}

export async function limpiarLockout(email: string, ip: string): Promise<void> {
  const cache = getCache();
  await cache.del(`lockout:${email.toLowerCase()}:${ip}`, `blocked:${email.toLowerCase()}`);
}

/** Dev helper: wipe lockout keys so QA is never stuck after failed attempts */
export async function limpiarTodosLosLockouts(): Promise<number> {
  const cache = getCache();
  const keys = await cache.keys('lockout:*');
  const blocked = await cache.keys('blocked:*');
  const all = [...keys, ...blocked];
  if (all.length === 0) return 0;
  await cache.del(...all);
  return all.length;
}
