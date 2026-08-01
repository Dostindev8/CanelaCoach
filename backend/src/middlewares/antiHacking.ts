import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

function ipKey(req: { ip?: string }): string {
  return req.ip || 'unknown';
}

/** Aggressive limiter for authenticated data routes. */
export const strictRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKey(req),
  message: {
    ok: false,
    error: { message: 'Demasiadas solicitudes. Intenta de nuevo en unos minutos.' },
  },
});

const suspiciousActivityLog = new Map<string, { count: number; firstSeen: number }>();

/** Soft scraping detector — >40 hits to same path/IP in 60s. */
export function detectScrapingPattern(req: Request, res: Response, next: NextFunction): void {
  const key = `${req.ip || 'unknown'}:${req.path}`;
  const now = Date.now();
  const record = suspiciousActivityLog.get(key) || { count: 0, firstSeen: now };

  if (now - record.firstSeen > 60_000) {
    record.count = 0;
    record.firstSeen = now;
  }
  record.count += 1;
  suspiciousActivityLog.set(key, record);

  if (record.count > 40) {
    res.status(429).json({ ok: false, error: { message: 'Actividad inusual detectada.' } });
    return;
  }
  next();
}
