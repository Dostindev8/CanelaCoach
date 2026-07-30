import { Router, Request, Response } from 'express';
import argon2 from 'argon2';
import { PacienteCuenta } from '../models/PacienteCuenta.js';
import { Cliente } from '../models/Cliente.js';
import { Evaluacion } from '../models/Evaluacion.js';
import { PlanAsignacion } from '../models/Plan.js';
import { Cita } from '../models/Cita.js';
import { Report } from '../models/Report.js';
import {
  requireAuth,
  requirePacienteAuth,
  signAccessToken,
  signRefreshToken,
  setAuthCookies,
} from '../middlewares/auth.js';
import { AppError, asyncHandler } from '../middlewares/errorHandler.js';
import {
  parseBody,
  pacienteLoginSchema,
  pacienteCuentaCreateSchema,
} from '../validators/schemas.js';
import { authRateLimit, registrarFalloLogin, estaBloqueado, limpiarLockout } from '../middlewares/rateLimit.js';

export const portalRouter = Router();

/** Coach creates patient portal account */
portalRouter.post(
  '/cuentas',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const data = parseBody(pacienteCuentaCreateSchema, req.body);
    const cliente = await Cliente.findOne({
      _id: data.clienteId,
      entrenadorId: req.entrenadorId,
      activo: true,
    });
    if (!cliente) throw new AppError('Cliente no encontrado', 404);

    const exists = await PacienteCuenta.findOne({
      $or: [{ email: data.email.toLowerCase() }, { clienteId: cliente._id }],
    });
    if (exists) throw new AppError('Ya existe cuenta para este email o cliente', 409);

    const passwordHash = await argon2.hash(data.password, { type: argon2.argon2id });
    const cuenta = await PacienteCuenta.create({
      clienteId: cliente._id,
      entrenadorId: req.entrenadorId,
      email: data.email.toLowerCase(),
      passwordHash,
    });

    res.status(201).json({
      ok: true,
      data: { id: cuenta._id, email: cuenta.email, clienteId: cuenta.clienteId },
    });
  })
);

portalRouter.post(
  '/login',
  authRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    const data = parseBody(pacienteLoginSchema, req.body);
    const email = data.email.toLowerCase();
    const ip = req.ip || 'unknown';

    const bloqueadoHasta =
      process.env.NODE_ENV === 'production' ? await estaBloqueado(`paciente:${email}`) : null;
    if (bloqueadoHasta) {
      throw new AppError(`Cuenta bloqueada hasta ${bloqueadoHasta.toISOString()}`, 429, 'LOCKED');
    }

    const cuenta = await PacienteCuenta.findOne({ email, activo: true }).select('+passwordHash');
    if (!cuenta) {
      await registrarFalloLogin(`paciente:${email}`, ip);
      throw new AppError('Credenciales inválidas', 401, 'AUTH');
    }

    const valid = await argon2.verify(cuenta.passwordHash, data.password);
    if (!valid) {
      await registrarFalloLogin(`paciente:${email}`, ip);
      throw new AppError('Credenciales inválidas', 401, 'AUTH');
    }

    await limpiarLockout(`paciente:${email}`, ip);
    cuenta.ultimoAcceso = new Date();
    await cuenta.save();

    const payload = {
      sub: String(cuenta._id),
      email: cuenta.email,
      rol: 'paciente' as const,
      nombre: 'Paciente',
      clienteId: String(cuenta.clienteId),
    };
    const access = signAccessToken(payload);
    const refresh = signRefreshToken(payload);
    setAuthCookies(res, access, refresh);

    const cliente = await Cliente.findById(cuenta.clienteId).select('nombre fotoPerfilUrl');
    res.json({
      ok: true,
      data: {
        user: {
          id: cuenta._id,
          email: cuenta.email,
          rol: 'paciente',
          nombre: cliente?.nombre || 'Paciente',
          clienteId: cuenta.clienteId,
          photoUrl: cliente?.fotoPerfilUrl,
        },
      },
    });
  })
);

portalRouter.get(
  '/me',
  requirePacienteAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const clienteId = req.clienteId!;
    const [cliente, evaluaciones, planes, proximaCita, reportes] = await Promise.all([
      Cliente.findById(clienteId).lean(),
      Evaluacion.find({ clienteId, activo: { $ne: false } })
        .sort({ fecha: -1 })
        .select(
          'fecha antropometria composicionCorporal resultadosCalculados fotografias reporte scoreFisico objetivosProximoMes notasEntrenador'
        )
        .lean(),
      PlanAsignacion.find({ clienteId, activo: true })
        .populate('planId')
        .sort({ asignadoEn: -1 })
        .lean(),
      Cita.findOne({
        clienteId,
        estado: 'programada',
        fecha: { $gte: new Date() },
      })
        .sort({ fecha: 1 })
        .lean(),
      Report.find({ clienteId }).sort({ generadoEn: -1 }).lean(),
    ]);

    if (!cliente) throw new AppError('Cliente no encontrado', 404);

    res.json({
      ok: true,
      data: {
        cliente: {
          _id: cliente._id,
          nombre: cliente.nombre,
          codigoCliente: cliente.codigoCliente,
          objetivo: cliente.objetivo,
          fotoPerfilUrl: cliente.fotoPerfilUrl,
        },
        evaluaciones,
        planes,
        proximaCita,
        reportes,
        avisos: evaluaciones
          .filter((e) => e.notasEntrenador || e.objetivosProximoMes)
          .slice(0, 5)
          .map((e) => ({
            fecha: e.fecha,
            notas: e.notasEntrenador,
            objetivos: e.objetivosProximoMes,
          })),
      },
    });
  })
);
