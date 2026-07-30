import { Request, Response } from 'express';
import argon2 from 'argon2';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { Entrenador } from '../models/Entrenador.js';
import { AppError, asyncHandler } from '../middlewares/errorHandler.js';
import {
  signAccessToken,
  signRefreshToken,
  setAuthCookies,
  clearAuthCookies,
  verifyToken,
} from '../middlewares/auth.js';
import { authRateLimit, registrarFalloLogin, estaBloqueado, limpiarLockout } from '../middlewares/rateLimit.js';
import { parseBody, registroSchema, loginSchema, mfaVerificarSchema } from '../validators/schemas.js';
import { registrarAuditoria } from '../middlewares/audit.js';
import { Router } from 'express';
import { requireAuth, requireRole } from '../middlewares/auth.js';

authenticator.options = { window: 1 }; // ±30s

export const authRouter = Router();

authRouter.post(
  '/registro',
  requireAuth,
  requireRole('admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const data = parseBody(registroSchema, req.body);
    const exists = await Entrenador.findOne({ email: data.email.toLowerCase() });
    if (exists) throw new AppError('Email ya registrado', 409, 'CONFLICT');

    const passwordHash = await argon2.hash(data.password, { type: argon2.argon2id });
    const entrenador = await Entrenador.create({
      nombre: data.nombre,
      email: data.email.toLowerCase(),
      passwordHash,
      rol: data.rol,
      mfaObligatorio: data.rol === 'admin',
    });

    res.status(201).json({
      ok: true,
      data: {
        id: entrenador._id,
        nombre: entrenador.nombre,
        email: entrenador.email,
        rol: entrenador.rol,
      },
    });
  })
);

authRouter.post(
  '/login',
  authRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    const data = parseBody(loginSchema, req.body);
    const email = data.email.toLowerCase();
    const ip = req.ip || 'unknown';

    // In development, never soft-lock QA accounts (prod lockout still applies)
    const bloqueadoHasta =
      process.env.NODE_ENV === 'production' ? await estaBloqueado(email) : null;
    if (bloqueadoHasta) {
      throw new AppError(
        `Cuenta bloqueada hasta ${bloqueadoHasta.toISOString()}`,
        429,
        'LOCKED',
        { hasta: bloqueadoHasta }
      );
    }

    const entrenador = await Entrenador.findOne({ email }).select(
      '+passwordHash +mfaSecret email mfaHabilitado mfaObligatorio activo rol nombre intentosFallidosLogin'
    );

    if (!entrenador || !entrenador.activo) {
      await registrarFalloLogin(email, ip);
      throw new AppError('Credenciales inválidas', 401, 'AUTH');
    }

    const valid = await argon2.verify(entrenador.passwordHash, data.password);
    if (!valid) {
      const lock = await registrarFalloLogin(email, ip);
      entrenador.intentosFallidosLogin = lock.intentos;
      if (lock.bloqueado) entrenador.bloqueadoHasta = lock.hasta;
      await entrenador.save();
      throw new AppError('Credenciales inválidas', 401, 'AUTH');
    }

    // MFA gate
    const needsMfa = entrenador.mfaHabilitado || entrenador.mfaObligatorio;
    if (needsMfa) {
      if (!entrenador.mfaHabilitado) {
        // Admin must set up MFA before proceeding
        const tempPayload = {
          sub: String(entrenador._id),
          email: entrenador.email,
          rol: entrenador.rol,
          nombre: entrenador.nombre,
        };
        const accessToken = signAccessToken(tempPayload);
        setAuthCookies(res, accessToken, signRefreshToken(tempPayload));
        return res.status(200).json({
          ok: true,
          data: {
            mfaRequired: true,
            mfaSetupRequired: true,
            user: { id: entrenador._id, email: entrenador.email, rol: entrenador.rol, nombre: entrenador.nombre, photoUrl: entrenador.photoUrl ?? null },
          },
        });
      }

      if (!data.totpCode) {
        return res.status(200).json({
          ok: true,
          data: { mfaRequired: true, mfaSetupRequired: false },
        });
      }

      const secret = (entrenador as unknown as { getMfaSecretPlain: () => string | null }).getMfaSecretPlain?.()
        || (entrenador.mfaSecret?.startsWith('enc:')
          ? null
          : entrenador.mfaSecret);

      // Decrypt via model method if available
      let plainSecret = secret;
      if (!plainSecret && entrenador.mfaSecret) {
        const { descifrarCampo } = await import('../utils/campoCifrado.js');
        plainSecret = entrenador.mfaSecret.startsWith('enc:')
          ? descifrarCampo(entrenador.mfaSecret.slice(4))
          : entrenador.mfaSecret;
      }

      if (!plainSecret || !authenticator.check(data.totpCode, plainSecret)) {
        await registrarFalloLogin(email, ip);
        throw new AppError('Código MFA inválido', 401, 'MFA_INVALID');
      }
    }

    await limpiarLockout(email, ip);
    entrenador.intentosFallidosLogin = 0;
    entrenador.bloqueadoHasta = undefined;
    await entrenador.save();

    const payload = {
      sub: String(entrenador._id),
      email: entrenador.email,
      rol: entrenador.rol,
      nombre: entrenador.nombre,
    };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);
    setAuthCookies(res, accessToken, refreshToken);

    await registrarAuditoria({
      entrenadorId: String(entrenador._id),
      accion: 'lectura',
      entidad: 'Entrenador',
      entidadId: String(entrenador._id),
      req,
      meta: { event: 'login' },
    });

    res.json({
      ok: true,
      data: {
        mfaRequired: false,
        user: {
          id: entrenador._id,
          email: entrenador.email,
          rol: entrenador.rol,
          nombre: entrenador.nombre,
          mfaHabilitado: entrenador.mfaHabilitado,
          photoUrl: entrenador.photoUrl ?? null,
        },
      },
    });
  })
);

authRouter.post(
  '/mfa/activar',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const secret = authenticator.generateSecret();
    const entrenador = await Entrenador.findById(req.entrenadorId).select('+mfaSecret');
    if (!entrenador) throw new AppError('No encontrado', 404);

    entrenador.mfaSecret = secret;
    await entrenador.save();

    const otpauth = authenticator.keyuri(entrenador.email, 'Canela Coach', secret);
    const qr = await QRCode.toDataURL(otpauth);

    res.json({
      ok: true,
      data: { secret, otpauth, qr },
    });
  })
);

authRouter.post(
  '/mfa/verificar',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { code } = parseBody(mfaVerificarSchema, req.body);
    const entrenador = await Entrenador.findById(req.entrenadorId).select('+mfaSecret');
    if (!entrenador?.mfaSecret) throw new AppError('MFA no iniciado', 400);

    const { descifrarCampo } = await import('../utils/campoCifrado.js');
    const plain = entrenador.mfaSecret.startsWith('enc:')
      ? descifrarCampo(entrenador.mfaSecret.slice(4))
      : entrenador.mfaSecret;

    if (!authenticator.check(code, plain)) {
      throw new AppError('Código inválido', 401, 'MFA_INVALID');
    }

    entrenador.mfaHabilitado = true;
    await entrenador.save();

    res.json({ ok: true, data: { mfaHabilitado: true } });
  })
);

authRouter.post(
  '/mfa/desactivar',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const entrenador = await Entrenador.findById(req.entrenadorId);
    if (!entrenador) throw new AppError('No encontrado', 404);
    if (entrenador.rol === 'admin') {
      throw new AppError('MFA es obligatorio para administradores', 403, 'MFA_REQUIRED');
    }
    entrenador.mfaHabilitado = false;
    entrenador.mfaSecret = undefined;
    await entrenador.save();
    res.json({ ok: true, data: { mfaHabilitado: false } });
  })
);

authRouter.post(
  '/refresh',
  asyncHandler(async (req: Request, res: Response) => {
    const token = req.cookies?.refresh_token;
    if (!token) throw new AppError('Sin refresh token', 401);
    const payload = verifyToken(token);
    if (payload.type !== 'refresh') throw new AppError('Token inválido', 401);

    const entrenador = await Entrenador.findById(payload.sub);
    if (!entrenador?.activo) throw new AppError('Cuenta inactiva', 401);

    const next = {
      sub: String(entrenador._id),
      email: entrenador.email,
      rol: entrenador.rol,
      nombre: entrenador.nombre,
    };
    setAuthCookies(res, signAccessToken(next), signRefreshToken(next));
    res.json({ ok: true });
  })
);

authRouter.post(
  '/logout',
  asyncHandler(async (_req: Request, res: Response) => {
    clearAuthCookies(res);
    res.json({ ok: true });
  })
);

authRouter.get(
  '/perfil',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const entrenador = await Entrenador.findById(req.entrenadorId).select('-passwordHash -mfaSecret');
    if (!entrenador) throw new AppError('No encontrado', 404);
    res.json({ ok: true, data: entrenador });
  })
);
