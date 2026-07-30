import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  statusCode: number;
  code: string;
  details?: unknown;

  constructor(message: string, statusCode = 400, code = 'APP_ERROR', details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      ok: false,
      error: { message: err.message, code: err.code, details: err.details },
    });
    return;
  }

  const anyErr = err as { name?: string; message?: string; statusCode?: number; errors?: unknown };
  if (anyErr?.name === 'ValidationError') {
    res.status(400).json({
      ok: false,
      error: { message: 'Validación fallida', code: 'VALIDATION', details: anyErr.errors },
    });
    return;
  }

  if (anyErr?.name === 'JsonWebTokenError' || anyErr?.name === 'TokenExpiredError') {
    res.status(401).json({ ok: false, error: { message: 'Token inválido o expirado', code: 'AUTH' } });
    return;
  }

  console.error('[error]', anyErr?.message || err);
  // Never log PII / antecedentes
  res.status(500).json({
    ok: false,
    error: { message: 'Error interno del servidor', code: 'INTERNAL' },
  });
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
