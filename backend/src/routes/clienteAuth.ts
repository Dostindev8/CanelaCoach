import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { Cliente } from '../models/Cliente.js';
import { AppError, asyncHandler } from '../middlewares/errorHandler.js';
import { parseBody } from '../validators/schemas.js';
import { PASSWORD_STRENGTH_REGEX } from '../utils/passwordUtils.js';
import {
  crearCodigoInvitacion,
  firmarJWTCliente,
  generarTokenAleatorio,
  hashClientePassword,
  limpiarFallosLoginCliente,
  registrarFalloLoginCliente,
  setClienteAuthCookie,
  clearClienteAuthCookie,
  validarCodigoInvitacion,
  verificarClientePassword,
} from '../services/clienteAuthService.js';
import {
  enviarResetPasswordCliente,
  enviarVerificacionEmailCliente,
} from '../services/clienteMail.js';
import { requireClienteAuth } from '../middlewares/clienteAuth.js';
import { requireAuth } from '../middlewares/auth.js';
import { registrarAuditoria } from '../middlewares/audit.js';
import { env } from '../config/env.js';
import { ipKeyGenerator } from '../middlewares/rateLimit.js';

export const clienteAuthRouter = Router();

const isDev = env.nodeEnv !== 'production';

const clienteAuthRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 500 : 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `cliente-auth:${ipKeyGenerator(req)}`,
  message: {
    ok: false,
    error: { message: 'Demasiados intentos. Espera unos minutos.', code: 'RATE_LIMIT' },
  },
});

const passwordSchema = z
  .string()
  .min(10)
  .max(128)
  .regex(PASSWORD_STRENGTH_REGEX, 'Mín. 10 chars, 1 mayúscula, 1 número y 1 símbolo');

const registroSchema = z
  .object({
    codigoInvitacion: z.string().min(4).max(32),
    nombre: z.string().min(2).max(120),
    email: z.string().email(),
    password: passwordSchema,
    confirmarPassword: z.string().min(10).max(128),
  })
  .refine((d) => d.password === d.confirmarPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmarPassword'],
  });

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const olvideSchema = z.object({ email: z.string().email() });

const resetSchema = z
  .object({
    token: z.string().min(16),
    nuevaPassword: passwordSchema,
    confirmarNuevaPassword: z.string().min(10).max(128),
  })
  .refine((d) => d.nuevaPassword === d.confirmarNuevaPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmarNuevaPassword'],
  });

clienteAuthRouter.use(clienteAuthRateLimit);

clienteAuthRouter.post(
  '/registro',
  asyncHandler(async (req: Request, res: Response) => {
    const data = parseBody(registroSchema, req.body);
    const invite = await validarCodigoInvitacion(data.codigoInvitacion);
    const email = data.email.toLowerCase().trim();

    const existing = await Cliente.findOne({ email });
    if (existing?.cuentaActiva || existing?.passwordHash) {
      throw new AppError('Este correo ya está registrado', 409, 'DUPLICATE');
    }

    const passwordHash = await hashClientePassword(data.password);
    const tokenVerificacionEmail = generarTokenAleatorio(32);
    const tokenVerificacionExpira = new Date(Date.now() + 24 * 60 * 60 * 1000);

    let cliente;
    if (invite.clienteIdPreexistente) {
      cliente = await Cliente.findOne({
        _id: invite.clienteIdPreexistente,
        entrenadorId: invite.entrenadorId,
      });
      if (!cliente) throw new AppError('Cliente preexistente no encontrado', 404);
      cliente.email = email;
      cliente.nombre = data.nombre;
      cliente.passwordHash = passwordHash;
      cliente.cuentaActiva = false;
      cliente.emailVerificado = false;
      cliente.tokenVerificacionEmail = tokenVerificacionEmail;
      cliente.tokenVerificacionExpira = tokenVerificacionExpira;
      cliente.codigoInvitacion = invite.codigo;
      cliente.sesionVersion = cliente.sesionVersion || 0;
      await cliente.save();
    } else {
      cliente = await Cliente.create({
        entrenadorId: invite.entrenadorId,
        nombre: data.nombre,
        email,
        edad: 25,
        sexo: 'Masculino',
        passwordHash,
        cuentaActiva: false,
        emailVerificado: false,
        tokenVerificacionEmail,
        tokenVerificacionExpira,
        codigoInvitacion: invite.codigo,
        membershipStatus: 'inactive',
        currentPeriodEnd: new Date(),
        evaluationFrequencyDays: 30,
        sesionVersion: 0,
      });
    }

    invite.usado = true;
    invite.usadoPor = cliente._id;
    await invite.save();

    await enviarVerificacionEmailCliente({
      email,
      nombre: data.nombre,
      token: tokenVerificacionEmail,
    });

    await registrarAuditoria({
      entrenadorId: String(invite.entrenadorId),
      clienteId: String(cliente._id),
      accion: 'creacion',
      entidad: 'ClientePortal',
      entidadId: String(cliente._id),
      req,
      meta: { flujo: 'autoregistro' },
    });

    res.status(201).json({
      ok: true,
      data: {
        message: 'Registro exitoso. Revisa tu correo para verificar tu cuenta.',
        email,
      },
    });
  })
);

clienteAuthRouter.get(
  '/verificar-email/:token',
  asyncHandler(async (req: Request, res: Response) => {
    const token = String(req.params.token || '');
    const cliente = await Cliente.findOne({
      tokenVerificacionEmail: token,
      tokenVerificacionExpira: { $gt: new Date() },
    }).select('+tokenVerificacionEmail +tokenVerificacionExpira');

    if (!cliente) {
      res.redirect(`${env.frontendUrl}/portal/login?verificado=false`);
      return;
    }

    cliente.emailVerificado = true;
    cliente.cuentaActiva = true;
    cliente.tokenVerificacionEmail = null;
    cliente.tokenVerificacionExpira = null;
    await cliente.save();

    res.redirect(`${env.frontendUrl}/portal/login?verificado=true`);
  })
);

/** JSON verify for SPA (optional companion to redirect). */
clienteAuthRouter.post(
  '/verificar-email',
  asyncHandler(async (req: Request, res: Response) => {
    const token = String(req.body?.token || '');
    const cliente = await Cliente.findOne({
      tokenVerificacionEmail: token,
      tokenVerificacionExpira: { $gt: new Date() },
    }).select('+tokenVerificacionEmail +tokenVerificacionExpira');
    if (!cliente) throw new AppError('Token inválido o expirado', 400, 'TOKEN');

    cliente.emailVerificado = true;
    cliente.cuentaActiva = true;
    cliente.tokenVerificacionEmail = null;
    cliente.tokenVerificacionExpira = null;
    await cliente.save();

    res.json({ ok: true, data: { verificado: true } });
  })
);

clienteAuthRouter.post(
  '/login',
  asyncHandler(async (req: Request, res: Response) => {
    const data = parseBody(loginSchema, req.body);
    const email = data.email.toLowerCase().trim();

    const cliente = await Cliente.findOne({ email }).select(
      '+passwordHash intentosFallidosLogin bloqueadoHasta cuentaActiva emailVerificado sesionVersion nombre entrenadorId'
    );

    if (!cliente || !cliente.passwordHash) {
      throw new AppError('Credenciales inválidas', 401, 'AUTH');
    }

    if (cliente.bloqueadoHasta && cliente.bloqueadoHasta.getTime() > Date.now()) {
      throw new AppError(
        `Cuenta bloqueada hasta ${cliente.bloqueadoHasta.toISOString()}`,
        429,
        'LOCKED'
      );
    }

    if (!cliente.emailVerificado) {
      throw new AppError('Verifica tu correo antes de iniciar sesión', 403, 'EMAIL_UNVERIFIED');
    }

    if (!cliente.cuentaActiva) {
      throw new AppError('Cuenta inactiva', 403, 'INACTIVE');
    }

    const valid = await verificarClientePassword(cliente.passwordHash, data.password);
    if (!valid) {
      await registrarFalloLoginCliente(String(cliente._id));
      throw new AppError('Credenciales inválidas', 401, 'AUTH');
    }

    await limpiarFallosLoginCliente(String(cliente._id));
    cliente.ultimoAcceso = new Date();
    await cliente.save();

    const token = firmarJWTCliente({
      sub: String(cliente._id),
      email: cliente.email || email,
      entrenadorId: String(cliente.entrenadorId),
      sesionVersion: cliente.sesionVersion || 0,
    });
    setClienteAuthCookie(res, token);

    await registrarAuditoria({
      entrenadorId: String(cliente.entrenadorId),
      clienteId: String(cliente._id),
      accion: 'lectura',
      entidad: 'Cliente',
      entidadId: String(cliente._id),
      req,
      meta: { evento: 'portal_login' },
    });

    res.json({
      ok: true,
      data: {
        user: {
          id: cliente._id,
          nombre: cliente.nombre,
          email: cliente.email,
          entrenadorId: cliente.entrenadorId,
        },
      },
    });
  })
);

clienteAuthRouter.post(
  '/logout',
  asyncHandler(async (_req: Request, res: Response) => {
    clearClienteAuthCookie(res);
    res.json({ ok: true, data: { loggedOut: true } });
  })
);

clienteAuthRouter.post(
  '/olvide-password',
  asyncHandler(async (req: Request, res: Response) => {
    const data = parseBody(olvideSchema, req.body);
    const email = data.email.toLowerCase().trim();
    const cliente = await Cliente.findOne({ email }).select(
      '+passwordHash +tokenResetPassword nombre'
    );

    if (cliente) {
      const token = generarTokenAleatorio(32);
      cliente.tokenResetPassword = token;
      cliente.tokenResetPasswordExpira = new Date(Date.now() + 60 * 60 * 1000);
      await cliente.save();
      await enviarResetPasswordCliente({
        email,
        nombre: cliente.nombre,
        token,
      });
    }

    res.json({
      ok: true,
      data: { message: 'Si el correo existe, se envió un enlace de restablecimiento.' },
    });
  })
);

clienteAuthRouter.post(
  '/reset-password',
  asyncHandler(async (req: Request, res: Response) => {
    const data = parseBody(resetSchema, req.body);
    const cliente = await Cliente.findOne({
      tokenResetPassword: data.token,
      tokenResetPasswordExpira: { $gt: new Date() },
    }).select('+tokenResetPassword +tokenResetPasswordExpira +passwordHash');

    if (!cliente) throw new AppError('Token inválido o expirado', 400, 'TOKEN');

    cliente.passwordHash = await hashClientePassword(data.nuevaPassword);
    cliente.tokenResetPassword = null;
    cliente.tokenResetPasswordExpira = null;
    cliente.sesionVersion = (cliente.sesionVersion || 0) + 1;
    cliente.intentosFallidosLogin = 0;
    cliente.bloqueadoHasta = null;
    await cliente.save();

    clearClienteAuthCookie(res);

    res.json({ ok: true, data: { message: 'Contraseña actualizada. Inicia sesión.' } });
  })
);

clienteAuthRouter.get(
  '/yo',
  requireClienteAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const cliente = await Cliente.findById(req.clienteAuth!.id)
      .select('nombre email entrenadorId codigoCliente objetivo fotoPerfilUrl membershipStatus currentPeriodEnd nextEvaluationDate')
      .lean();
    if (!cliente) throw new AppError('Cliente no encontrado', 404);
    res.json({ ok: true, data: cliente });
  })
);

/** Coach generates invitation code (EXTEND coach panel). */
clienteAuthRouter.post(
  '/codigos-invitacion',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const clienteIdPreexistente = req.body?.clienteId ? String(req.body.clienteId) : null;
    if (clienteIdPreexistente) {
      const c = await Cliente.findOne({
        _id: clienteIdPreexistente,
        entrenadorId: req.entrenadorId,
      });
      if (!c) throw new AppError('Cliente no encontrado', 404);
    }
    const doc = await crearCodigoInvitacion({
      entrenadorId: req.entrenadorId!,
      clienteIdPreexistente,
    });
    res.status(201).json({
      ok: true,
      data: {
        codigo: doc.codigo,
        expiraEn: doc.expiraEn,
        registroUrl: `${env.frontendUrl}/portal/registro?codigo=${doc.codigo}`,
      },
    });
  })
);
