import { Router, Request, Response } from 'express';
import { Cliente, clienteConAntecedentesDescifrados } from '../models/Cliente.js';
import { Evaluacion } from '../models/Evaluacion.js';
import { Entrenador } from '../models/Entrenador.js';
import {
  CuestionarioIngreso,
  cuestionarioDescifrado,
} from '../models/CuestionarioIngreso.js';
import { PlanAsignacion } from '../models/Plan.js';
import { Cita } from '../models/Cita.js';
import { Report } from '../models/Report.js';
import { requireAuth } from '../middlewares/auth.js';
import { AppError, asyncHandler } from '../middlewares/errorHandler.js';
import { parseBody, clienteSchema, cuestionarioIngresoSchema, pagoClienteSchema, membershipPatchSchema } from '../validators/schemas.js';
import { registrarAuditoria } from '../middlewares/audit.js';
import { cacheDel } from '../config/redis.js';
import { aplicarCuestionarioACliente } from '../services/syncCuestionarioCliente.js';
import { paramId } from '../utils/params.js';
import { entrenadorScope, isAdmin } from '../utils/accessScope.js';
import {
  buildClienteProgreso,
  resumenDesdeUltimaEval,
  type EvalProgresoLike,
} from '../services/clienteProgreso.js';
import {
  computeMembershipStatus,
  defaultPeriodEnd,
  type MembershipStatus,
} from '../services/membership.js';
const EVAL_ACTIVA = { activo: { $ne: false } } as const;

export const clientesRouter = Router();
clientesRouter.use(requireAuth);

async function assertClienteOwn(clienteId: string, req: Request) {
  const cliente = await Cliente.findOne(
    isAdmin(req)
      ? { _id: clienteId }
      : { _id: clienteId, entrenadorId: req.entrenadorId }
  );
  if (!cliente) throw new AppError('Cliente no encontrado', 404);
  return cliente;
}

clientesRouter.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const q = String(req.query.q || '').trim();
    // Soft-delete archive only when explicitly requested; default keeps non-archived.
    const activo = req.query.activo === undefined ? true : req.query.activo === 'true';
    const status = String(req.query.status || 'all') as MembershipStatus | 'all';

    const filter: Record<string, unknown> = {
      ...entrenadorScope(req),
      activo,
    };
    if (status !== 'all' && ['active', 'inactive', 'paused', 'cancelled'].includes(status)) {
      filter.membershipStatus = status;
    }
    if (q) {
      filter.$or = [
        { nombre: { $regex: q, $options: 'i' } },
        { codigoCliente: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
      ];
    }

    const scopeBase = { ...entrenadorScope(req), activo: true };

    const [items, total, activeCount, inactiveCount, pausedCount, cancelledCount] = await Promise.all([
      Cliente.find(filter)
        .sort({ membershipStatus: 1, nombre: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select('-antecedentes')
        .lean(),
      Cliente.countDocuments(filter),
      Cliente.countDocuments({ ...scopeBase, membershipStatus: 'active' }),
      Cliente.countDocuments({ ...scopeBase, membershipStatus: 'inactive' }),
      Cliente.countDocuments({ ...scopeBase, membershipStatus: 'paused' }),
      Cliente.countDocuments({ ...scopeBase, membershipStatus: 'cancelled' }),
    ]);

    const ids = items.map((c) => c._id);
    const resumenByCliente = new Map<string, ReturnType<typeof resumenDesdeUltimaEval>>();

    if (ids.length > 0) {
      const evals = await Evaluacion.find({
        clienteId: { $in: ids },
        ...entrenadorScope(req),
        ...EVAL_ACTIVA,
      })
        .sort({ fecha: -1 })
        .select(
          'clienteId fecha antropometria composicionCorporal resultadosCalculados scoreFisico weightLb'
        )
        .lean();

      const counts = new Map<string, number>();
      for (const e of evals) {
        const cid = String(e.clienteId);
        counts.set(cid, (counts.get(cid) || 0) + 1);
        if (!resumenByCliente.has(cid)) {
          resumenByCliente.set(cid, resumenDesdeUltimaEval(0, e as EvalProgresoLike));
        }
      }
      for (const [cid, resumen] of resumenByCliente) {
        resumen.totalEvaluaciones = counts.get(cid) || 0;
      }
    }

    const itemsConProgreso = items.map((c) => {
      const computedStatus = computeMembershipStatus({
        membershipStatus: c.membershipStatus as MembershipStatus,
        currentPeriodEnd: c.currentPeriodEnd,
        gracePeriodDays: c.gracePeriodDays,
      });
      return {
        ...c,
        computedStatus,
        progresoResumen: resumenByCliente.get(String(c._id)) || resumenDesdeUltimaEval(0, null),
      };
    });

    res.json({
      ok: true,
      data: {
        items: itemsConProgreso,
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
        summary: {
          active: activeCount,
          inactive: inactiveCount,
          paused: pausedCount,
          cancelled: cancelledCount,
        },
      },
    });
  })
);

clientesRouter.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const data = parseBody(clienteSchema, req.body);
    const entrenador = await Entrenador.findById(req.entrenadorId);
    if (!entrenador) throw new AppError('Entrenador no encontrado', 404);

    const activos = await Cliente.countDocuments({ entrenadorId: req.entrenadorId, activo: true });
    if (activos >= entrenador.limiteClientes) {
      throw new AppError(`Límite de ${entrenador.limiteClientes} clientes alcanzado`, 403, 'LIMIT');
    }

    const cliente = await Cliente.create({
      ...data,
      entrenadorId: req.entrenadorId,
      membershipStatus: 'active',
      currentPeriodEnd: defaultPeriodEnd(),
      gracePeriodDays: 5,
      evaluationFrequencyDays: 30,
      nextEvaluationDate: defaultPeriodEnd(new Date(), 30),
    });

    await registrarAuditoria({
      entrenadorId: req.entrenadorId!,
      clienteId: String(cliente._id),
      accion: 'creacion',
      entidad: 'Cliente',
      entidadId: String(cliente._id),
      req,
    });
    await cacheDel(`dashboard:${req.entrenadorId}`);

    res.status(201).json({ ok: true, data: clienteConAntecedentesDescifrados(cliente) });
  })
);

clientesRouter.get(
  '/:id/cuestionario-ingreso',
  asyncHandler(async (req: Request, res: Response) => {
    const clienteId = paramId(req.params.id);
    await assertClienteOwn(clienteId, req);
    const doc = await CuestionarioIngreso.findOne({ clienteId, ...entrenadorScope(req) });
    if (!doc) {
      return res.json({ ok: true, data: null });
    }
    res.json({ ok: true, data: cuestionarioDescifrado(doc) });
  })
);

clientesRouter.post(
  '/:id/cuestionario-ingreso',
  asyncHandler(async (req: Request, res: Response) => {
    const clienteId = paramId(req.params.id);
    const cliente = await assertClienteOwn(clienteId, req);
    const existing = await CuestionarioIngreso.findOne({ clienteId });
    if (existing) {
      throw new AppError(
        'Ya existe un cuestionario de ingreso. Usa PUT para actualizar.',
        409,
        'DUPLICATE'
      );
    }

    const data = parseBody(cuestionarioIngresoSchema, req.body);
    const consentimiento = data.consentimientoInformado;
    if (!consentimiento?.aceptaTerminos || !consentimiento?.aceptaEvaluacionesFisicas) {
      throw new AppError('Se requiere aceptar términos y evaluaciones físicas', 400);
    }
    if (!consentimiento.firmaDigital || consentimiento.firmaDigital.trim().length < 2) {
      throw new AppError('Firma digital requerida', 400);
    }

    const doc = await CuestionarioIngreso.create({
      ...data,
      clienteId,
      entrenadorId: cliente.entrenadorId,
      consentimientoInformado: {
        ...consentimiento,
        fechaConsentimiento: consentimiento.fechaConsentimiento || new Date(),
      },
    });

    aplicarCuestionarioACliente(cliente, cuestionarioDescifrado(doc));
    await cliente.save();
    await cacheDel(`dashboard:${req.entrenadorId}`);

    await registrarAuditoria({
      entrenadorId: req.entrenadorId!,
      clienteId,
      accion: 'creacion',
      entidad: 'CuestionarioIngreso',
      entidadId: String(doc._id),
      req,
    });

    res.status(201).json({ ok: true, data: cuestionarioDescifrado(doc) });
  })
);

clientesRouter.put(
  '/:id/cuestionario-ingreso',
  asyncHandler(async (req: Request, res: Response) => {
    const clienteId = paramId(req.params.id);
    const cliente = await assertClienteOwn(clienteId, req);
    const doc = await CuestionarioIngreso.findOne({ clienteId, ...entrenadorScope(req) });
    if (!doc) throw new AppError('Cuestionario no encontrado. Usa POST para crearlo.', 404);

    const data = parseBody(cuestionarioIngresoSchema, req.body);
    Object.assign(doc, data);
    if (data.consentimientoInformado) {
      doc.consentimientoInformado = {
        ...(doc.consentimientoInformado || {}),
        ...data.consentimientoInformado,
      };
    }
    await doc.save();

    aplicarCuestionarioACliente(cliente, cuestionarioDescifrado(doc));
    await cliente.save();
    await cacheDel(`dashboard:${req.entrenadorId}`);

    await registrarAuditoria({
      entrenadorId: req.entrenadorId!,
      clienteId,
      accion: 'edicion',
      entidad: 'CuestionarioIngreso',
      entidadId: String(doc._id),
      req,
    });

    res.json({ ok: true, data: cuestionarioDescifrado(doc) });
  })
);

clientesRouter.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const cliente = await Cliente.findOne(
      isAdmin(req) ? { _id: req.params.id } : { _id: req.params.id, entrenadorId: req.entrenadorId }
    );
    if (!cliente) throw new AppError('Cliente no encontrado', 404);

    const evaluaciones = await Evaluacion.find({
      clienteId: cliente._id,
      ...entrenadorScope(req),
      ...EVAL_ACTIVA,
    })
      .sort({ fecha: -1 })
      .lean();

    const tieneCuestionario = !!(await CuestionarioIngreso.exists({
      clienteId: cliente._id,
      ...(isAdmin(req) ? {} : { entrenadorId: req.entrenadorId }),
    }));

    await registrarAuditoria({
      entrenadorId: req.entrenadorId!,
      clienteId: String(cliente._id),
      accion: 'lectura',
      entidad: 'Cliente',
      entidadId: String(cliente._id),
      req,
    });

    res.json({
      ok: true,
      data: {
        ...clienteConAntecedentesDescifrados(cliente),
        evaluacionesRecientes: evaluaciones.slice(0, 3),
        tieneCuestionario,
        progreso: buildClienteProgreso(evaluaciones as EvalProgresoLike[]),
      },
    });
  })
);

clientesRouter.put(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const data = parseBody(clienteSchema.partial(), req.body);
    const cliente = await Cliente.findOne(isAdmin(req) ? { _id: req.params.id } : { _id: req.params.id, entrenadorId: req.entrenadorId });
    if (!cliente) throw new AppError('Cliente no encontrado', 404);

    Object.assign(cliente, data);
    await cliente.save();

    await registrarAuditoria({
      entrenadorId: req.entrenadorId!,
      clienteId: String(cliente._id),
      accion: 'edicion',
      entidad: 'Cliente',
      entidadId: String(cliente._id),
      req,
    });
    await cacheDel(`dashboard:${req.entrenadorId}`);

    res.json({ ok: true, data: clienteConAntecedentesDescifrados(cliente) });
  })
);

clientesRouter.get(
  '/:id/expediente',
  asyncHandler(async (req: Request, res: Response) => {
    const clienteId = paramId(req.params.id);
    const cliente = await assertClienteOwn(clienteId, req);
    const [evaluaciones, planes, citas, reportes, cuestionario] = await Promise.all([
      Evaluacion.find({ clienteId, ...entrenadorScope(req), ...EVAL_ACTIVA })
        .sort({ fecha: -1 })
        .lean(),
      PlanAsignacion.find({ clienteId, ...entrenadorScope(req), activo: true })
        .populate('planId')
        .sort({ asignadoEn: -1 })
        .lean(),
      Cita.find({ clienteId, ...entrenadorScope(req) }).sort({ fecha: -1 }).lean(),
      Report.find({ clienteId, ...entrenadorScope(req) }).sort({ generadoEn: -1 }).lean(),
      CuestionarioIngreso.findOne({
        clienteId,
        ...(isAdmin(req) ? {} : { entrenadorId: req.entrenadorId }),
      }).lean(),
    ]);

    const progreso = buildClienteProgreso(evaluaciones as EvalProgresoLike[]);

    const timeline = [
      {
        tipo: 'registro',
        fecha: cliente.createdAt,
        titulo: 'Registro inicial',
        detalle: cliente.objetivo,
      },
      ...(cuestionario
        ? [
            {
              tipo: 'cuestionario',
              fecha: cuestionario.updatedAt || cuestionario.createdAt,
              titulo: 'Cuestionario de ingreso',
              detalle: cuestionario.objetivoPrincipal,
            },
          ]
        : []),
      ...evaluaciones.map((e) => ({
        tipo: 'evaluacion',
        fecha: e.fecha,
        titulo: `Evaluación ${e.tipo}`,
        id: e._id,
        score: e.scoreFisico?.valor,
        fotos: e.fotografias,
      })),
      ...planes.map((p) => ({
        tipo: 'plan',
        fecha: p.asignadoEn,
        titulo: `Plan: ${(p.planId as { nombre?: string })?.nombre || 'asignado'}`,
        id: p._id,
      })),
      ...citas.map((c) => ({
        tipo: 'cita',
        fecha: c.fecha,
        titulo: `Cita (${c.estado})`,
        detalle: c.notas,
        id: c._id,
      })),
      ...reportes.map((r) => ({
        tipo: 'reporte',
        fecha: r.generadoEn,
        titulo: `Reporte ${r.tipo}`,
        url: r.pdfUrl,
        id: r._id,
      })),
    ].sort((a, b) => new Date(b.fecha as Date).getTime() - new Date(a.fecha as Date).getTime());

    res.json({
      ok: true,
      data: {
        cliente: clienteConAntecedentesDescifrados(cliente),
        evaluaciones,
        planes,
        citas,
        reportes,
        timeline,
        progreso,
        cuestionario: cuestionario
          ? {
              objetivoPrincipal: cuestionario.objetivoPrincipal,
              updatedAt: cuestionario.updatedAt,
            }
          : null,
      },
    });
  })
);

clientesRouter.post(
  '/:id/pagos',
  asyncHandler(async (req: Request, res: Response) => {
    const clienteId = paramId(req.params.id);
    const cliente = await assertClienteOwn(clienteId, req);
    const data = parseBody(pagoClienteSchema, req.body);
    const paidAt = data.paidAt || new Date();

    cliente.paymentHistory.push({
      amount: data.amount,
      currency: data.currency || 'DOP',
      paidAt,
      method: data.method,
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      registeredBy: req.entrenadorId as unknown as import('mongoose').Types.ObjectId,
      notes: data.notes,
    });
    cliente.currentPeriodEnd = data.periodEnd;
    cliente.membershipStatus = 'active';
    await cliente.save();

    await registrarAuditoria({
      entrenadorId: req.entrenadorId!,
      clienteId,
      accion: 'edicion',
      entidad: 'ClientePago',
      entidadId: clienteId,
      req,
    });
    await cacheDel(`dashboard:${req.entrenadorId}`);

    res.status(201).json({
      ok: true,
      data: clienteConAntecedentesDescifrados(cliente),
    });
  })
);

clientesRouter.patch(
  '/:id/membresia',
  asyncHandler(async (req: Request, res: Response) => {
    const clienteId = paramId(req.params.id);
    const cliente = await assertClienteOwn(clienteId, req);
    const data = parseBody(membershipPatchSchema, req.body);
    if (data.membershipStatus) cliente.membershipStatus = data.membershipStatus;
    if (data.currentPeriodEnd) cliente.currentPeriodEnd = data.currentPeriodEnd;
    if (data.gracePeriodDays != null) cliente.gracePeriodDays = data.gracePeriodDays;
    if (data.nextEvaluationDate !== undefined) cliente.nextEvaluationDate = data.nextEvaluationDate;
    if (data.evaluationFrequencyDays != null) {
      cliente.evaluationFrequencyDays = data.evaluationFrequencyDays;
    }
    await cliente.save();
    await cacheDel(`dashboard:${req.entrenadorId}`);
    res.json({ ok: true, data: clienteConAntecedentesDescifrados(cliente) });
  })
);

clientesRouter.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const cliente = await Cliente.findOne(isAdmin(req) ? { _id: req.params.id } : { _id: req.params.id, entrenadorId: req.entrenadorId });
    if (!cliente) throw new AppError('Cliente no encontrado', 404);

    cliente.activo = false;
    cliente.membershipStatus = 'cancelled';
    await cliente.save();

    await registrarAuditoria({
      entrenadorId: req.entrenadorId!,
      clienteId: String(cliente._id),
      accion: 'eliminacion',
      entidad: 'Cliente',
      entidadId: String(cliente._id),
      req,
    });
    await cacheDel(`dashboard:${req.entrenadorId}`);

    res.json({ ok: true, data: { id: cliente._id, activo: false, membershipStatus: 'cancelled' } });
  })
);
