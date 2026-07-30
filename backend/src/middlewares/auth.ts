import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from './errorHandler.js';
import { Entrenador } from '../models/Entrenador.js';
import { PacienteCuenta } from '../models/PacienteCuenta.js';

export interface AuthPayload {
  sub: string;
  email: string;
  rol: 'admin' | 'entrenador' | 'paciente';
  nombre: string;
  type: 'access' | 'refresh';
  clienteId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
      entrenadorId?: string;
      clienteId?: string;
    }
  }
}

export function signAccessToken(payload: Omit<AuthPayload, 'type'>): string {
  return jwt.sign({ ...payload, type: 'access' }, env.jwtPrivateKey, {
    algorithm: 'RS256',
    expiresIn: env.jwtAccessTtl as jwt.SignOptions['expiresIn'],
  });
}

export function signRefreshToken(payload: Omit<AuthPayload, 'type'>): string {
  return jwt.sign({ ...payload, type: 'refresh' }, env.jwtPrivateKey, {
    algorithm: 'RS256',
    expiresIn: env.jwtRefreshTtl as jwt.SignOptions['expiresIn'],
  });
}

export function verifyToken(token: string): AuthPayload {
  return jwt.verify(token, env.jwtPublicKey, { algorithms: ['RS256'] }) as AuthPayload;
}

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  const isProd = env.nodeEnv === 'production';
  res.cookie('access_token', accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000,
    path: '/',
  });
  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/auth',
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie('access_token', { path: '/' });
  res.clearCookie('refresh_token', { path: '/api/auth' });
}

function extractToken(req: Request): string | undefined {
  return (
    req.cookies?.access_token ||
    (req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : undefined)
  );
}

/** Coach/admin auth — rejects patient tokens */
export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const token = extractToken(req);
    if (!token) throw new AppError('No autenticado', 401, 'UNAUTHORIZED');

    const payload = verifyToken(token);
    if (payload.type !== 'access') throw new AppError('Token inválido', 401, 'UNAUTHORIZED');
    if (payload.rol === 'paciente') {
      throw new AppError('Acceso de coach requerido', 403, 'FORBIDDEN');
    }

    const entrenador = await Entrenador.findById(payload.sub).select(
      'activo rol email nombre mfaHabilitado mfaObligatorio'
    );
    if (!entrenador || !entrenador.activo) {
      throw new AppError('Cuenta inactiva o no encontrada', 401, 'UNAUTHORIZED');
    }

    req.user = {
      sub: String(entrenador._id),
      email: entrenador.email,
      rol: entrenador.rol,
      nombre: entrenador.nombre,
      type: 'access',
    };
    req.entrenadorId = String(entrenador._id);
    (req as Request & { mfaHabilitado?: boolean; mfaObligatorio?: boolean }).mfaHabilitado =
      entrenador.mfaHabilitado;
    (req as Request & { mfaObligatorio?: boolean }).mfaObligatorio = entrenador.mfaObligatorio;
    next();
  } catch (err) {
    next(err instanceof AppError ? err : new AppError('No autenticado', 401, 'UNAUTHORIZED'));
  }
}

/**
 * Blocks coaches that must have MFA but have not completed setup.
 * Applied to clinical routes (evaluaciones / protocolos).
 */
export function requireMfaIfMandatory(req: Request, _res: Response, next: NextFunction): void {
  const r = req as Request & { mfaHabilitado?: boolean; mfaObligatorio?: boolean };
  if (r.mfaObligatorio && !r.mfaHabilitado) {
    next(new AppError('Debes activar MFA antes de acceder a datos clínicos', 403, 'MFA_REQUIRED'));
    return;
  }
  next();
}

/** Patient portal auth — scopes to own clienteId only */
export async function requirePacienteAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractToken(req);
    if (!token) throw new AppError('No autenticado', 401, 'UNAUTHORIZED');

    const payload = verifyToken(token);
    if (payload.type !== 'access' || payload.rol !== 'paciente') {
      throw new AppError('Acceso de paciente requerido', 403, 'FORBIDDEN');
    }

    const cuenta = await PacienteCuenta.findById(payload.sub).select('activo clienteId email');
    if (!cuenta || !cuenta.activo) {
      throw new AppError('Cuenta inactiva o no encontrada', 401, 'UNAUTHORIZED');
    }

    req.user = {
      sub: String(cuenta._id),
      email: cuenta.email,
      rol: 'paciente',
      nombre: payload.nombre || 'Paciente',
      type: 'access',
      clienteId: String(cuenta.clienteId),
    };
    req.clienteId = String(cuenta.clienteId);
    next();
  } catch (err) {
    next(err instanceof AppError ? err : new AppError('No autenticado', 401, 'UNAUTHORIZED'));
  }
}

export function requireRole(...roles: Array<'admin' | 'entrenador' | 'paciente'>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.rol)) {
      next(new AppError('Permiso denegado', 403, 'FORBIDDEN'));
      return;
    }
    next();
  };
}
