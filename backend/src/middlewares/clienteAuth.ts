import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler.js';
import { Cliente } from '../models/Cliente.js';
import {
  getClienteCookieName,
  verificarJWTCliente,
} from '../services/clienteAuthService.js';

declare global {
  namespace Express {
    interface Request {
      clienteAuth?: { id: string; entrenadorId: string; email: string };
    }
  }
}

/**
 * Parallel client auth — NEVER accepts trainer JWTs (RS256 / access_token).
 * Requires claim tipo:'cliente' + aud:'cliente-portal' + matching sesionVersion.
 */
export async function requireClienteAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const raw =
      req.cookies?.[getClienteCookieName()] ||
      (req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.slice(7)
        : undefined);

    if (!raw) throw new AppError('No autenticado', 401, 'UNAUTHORIZED');

    let payload;
    try {
      payload = verificarJWTCliente(raw);
    } catch {
      throw new AppError('Sesión de cliente inválida', 401, 'UNAUTHORIZED');
    }

    if (payload.tipo !== 'cliente') {
      throw new AppError('Token no válido para portal cliente', 401, 'UNAUTHORIZED');
    }

    const cliente = await Cliente.findById(payload.sub).select(
      'activo cuentaActiva emailVerificado sesionVersion email entrenadorId'
    );
    if (!cliente || !cliente.activo || !cliente.cuentaActiva || !cliente.emailVerificado) {
      throw new AppError('Cuenta inactiva o no verificada', 401, 'UNAUTHORIZED');
    }

    if ((cliente.sesionVersion || 0) !== (payload.sesionVersion || 0)) {
      throw new AppError('Sesión invalidada. Inicia sesión de nuevo.', 401, 'UNAUTHORIZED');
    }

    req.clienteAuth = {
      id: String(cliente._id),
      entrenadorId: String(cliente.entrenadorId),
      email: cliente.email || payload.email,
    };
    req.clienteId = String(cliente._id);
    next();
  } catch (err) {
    next(err instanceof AppError ? err : new AppError('No autenticado', 401, 'UNAUTHORIZED'));
  }
}
