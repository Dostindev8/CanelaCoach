import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { hashPassword, verifyPassword } from '../utils/passwordUtils.js';
import { getCache } from '../config/redis.js';
import { Cliente } from '../models/Cliente.js';
import { CodigoInvitacion } from '../models/CodigoInvitacion.js';
import { AppError } from '../middlewares/errorHandler.js';

export type ClienteJwtPayload = {
  sub: string;
  email: string;
  entrenadorId: string;
  tipo: 'cliente';
  sesionVersion: number;
  aud: 'cliente-portal';
};

const COOKIE_NAME = 'cc_client_session';

function clientSecret(): string {
  if (env.clientJwtSecret && env.clientJwtSecret.length >= 32) return env.clientJwtSecret;
  if (env.nodeEnv !== 'production') {
    // Deterministic local-only fallback — never used in production (assertCriticalEnv).
    return 'canela-coach-dev-client-jwt-secret-32b';
  }
  throw new AppError('CLIENT_JWT_SECRET no configurado', 500, 'CONFIG');
}

export function generarTokenAleatorio(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

export function generarCodigoInvitacionPlain(): string {
  return crypto.randomBytes(4).toString('hex').toUpperCase(); // 8 hex chars
}

export async function hashClientePassword(plain: string): Promise<string> {
  return hashPassword(plain);
}

export async function verificarClientePassword(hash: string, plain: string): Promise<boolean> {
  return verifyPassword(hash, plain);
}

export function firmarJWTCliente(payload: Omit<ClienteJwtPayload, 'tipo' | 'aud'>): string {
  const body: ClienteJwtPayload = {
    ...payload,
    tipo: 'cliente',
    aud: 'cliente-portal',
  };
  return jwt.sign(body, clientSecret(), {
    algorithm: 'HS256',
    expiresIn: env.clientJwtTtl as jwt.SignOptions['expiresIn'],
  });
}

export function verificarJWTCliente(token: string): ClienteJwtPayload {
  const decoded = jwt.verify(token, clientSecret(), {
    algorithms: ['HS256'],
    audience: 'cliente-portal',
  }) as ClienteJwtPayload;
  if (decoded.tipo !== 'cliente') {
    throw new AppError('Token inválido para portal cliente', 401, 'UNAUTHORIZED');
  }
  return decoded;
}

export function setClienteAuthCookie(res: import('express').Response, token: string): void {
  const isProd = env.nodeEnv === 'production';
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

export function clearClienteAuthCookie(res: import('express').Response): void {
  res.clearCookie(COOKIE_NAME, { path: '/' });
}

export function getClienteCookieName(): string {
  return COOKIE_NAME;
}

/** Progressive lockout: 5 fails → 5 min, 10 → 1h (Redis Map fallback). */
export async function registrarFalloLoginCliente(clienteId: string): Promise<{
  intentos: number;
  bloqueadoHasta: Date | null;
}> {
  const cliente = await Cliente.findById(clienteId).select('intentosFallidosLogin');
  if (!cliente) return { intentos: 0, bloqueadoHasta: null };

  const intentos = (cliente.intentosFallidosLogin || 0) + 1;
  let bloqueadoHasta: Date | null = null;
  if (intentos >= 10) {
    bloqueadoHasta = new Date(Date.now() + 60 * 60 * 1000);
  } else if (intentos >= 5) {
    bloqueadoHasta = new Date(Date.now() + 5 * 60 * 1000);
  }

  cliente.intentosFallidosLogin = intentos;
  cliente.bloqueadoHasta = bloqueadoHasta;
  await cliente.save();

  const cache = getCache();
  await cache.set(`cliente-lockout:${clienteId}`, String(bloqueadoHasta?.getTime() || 0), 'EX', 3600);

  return { intentos, bloqueadoHasta };
}

export async function limpiarFallosLoginCliente(clienteId: string): Promise<void> {
  await Cliente.updateOne(
    { _id: clienteId },
    { $set: { intentosFallidosLogin: 0, bloqueadoHasta: null } }
  );
  await getCache().del(`cliente-lockout:${clienteId}`);
}

export async function crearCodigoInvitacion(opts: {
  entrenadorId: string;
  clienteIdPreexistente?: string | null;
  diasValidez?: number;
}) {
  const codigo = generarCodigoInvitacionPlain();
  const dias = opts.diasValidez ?? 7;
  const doc = await CodigoInvitacion.create({
    entrenadorId: opts.entrenadorId,
    codigo,
    clienteIdPreexistente: opts.clienteIdPreexistente || null,
    expiraEn: new Date(Date.now() + dias * 24 * 60 * 60 * 1000),
  });
  return doc;
}

export async function validarCodigoInvitacion(codigo: string) {
  const doc = await CodigoInvitacion.findOne({ codigo: codigo.trim().toUpperCase() });
  if (!doc) throw new AppError('Código de invitación inválido', 400, 'INVITE');
  if (doc.usado) throw new AppError('Código de invitación ya usado', 400, 'INVITE');
  if (doc.expiraEn.getTime() < Date.now()) {
    throw new AppError('Código de invitación expirado', 400, 'INVITE');
  }
  return doc;
}
