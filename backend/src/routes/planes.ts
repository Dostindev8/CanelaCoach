import { Router, Request, Response } from 'express';
import { Plan, PlanAsignacion } from '../models/Plan.js';
import { Cliente } from '../models/Cliente.js';
import { requireAuth } from '../middlewares/auth.js';
import { AppError, asyncHandler } from '../middlewares/errorHandler.js';
import { parseBody, planSchema, planAsignacionSchema } from '../validators/schemas.js';
import { paramId } from '../utils/params.js';
import { registrarAuditoria } from '../middlewares/audit.js';

export const planesRouter = Router();
planesRouter.use(requireAuth);

planesRouter.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const tipo = req.query.tipo ? String(req.query.tipo) : undefined;
    const tag = req.query.tag ? String(req.query.tag) : undefined;
    const q: Record<string, unknown> = { entrenadorId: req.entrenadorId, activo: true };
    if (tipo) q.tipo = tipo;
    if (tag) q.tags = tag;
    const items = await Plan.find(q).sort({ updatedAt: -1 }).lean();
    res.json({ ok: true, data: items });
  })
);

planesRouter.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const data = parseBody(planSchema, req.body);
    const plan = await Plan.create({
      ...data,
      tags: data.tags || [],
      entrenadorId: req.entrenadorId,
    });
    await registrarAuditoria({
      entrenadorId: req.entrenadorId!,
      accion: 'creacion',
      entidad: 'Plan',
      entidadId: String(plan._id),
      req,
    });
    res.status(201).json({ ok: true, data: plan });
  })
);

planesRouter.put(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const data = parseBody(planSchema.partial(), req.body);
    const plan = await Plan.findOneAndUpdate(
      { _id: paramId(req.params.id), entrenadorId: req.entrenadorId },
      { $set: data },
      { new: true }
    );
    if (!plan) throw new AppError('Plan no encontrado', 404);
    res.json({ ok: true, data: plan });
  })
);

planesRouter.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const plan = await Plan.findOneAndUpdate(
      { _id: paramId(req.params.id), entrenadorId: req.entrenadorId },
      { $set: { activo: false } },
      { new: true }
    );
    if (!plan) throw new AppError('Plan no encontrado', 404);
    res.json({ ok: true, data: { id: plan._id } });
  })
);

planesRouter.post(
  '/asignar',
  asyncHandler(async (req: Request, res: Response) => {
    const data = parseBody(planAsignacionSchema, req.body);
    const plan = await Plan.findOne({
      _id: data.planId,
      entrenadorId: req.entrenadorId,
      activo: true,
    });
    if (!plan) throw new AppError('Plan no encontrado', 404);
    const cliente = await Cliente.findOne({
      _id: data.clienteId,
      entrenadorId: req.entrenadorId,
      activo: true,
    });
    if (!cliente) throw new AppError('Cliente no encontrado', 404);

    const asignacion = await PlanAsignacion.create({
      planId: plan._id,
      clienteId: cliente._id,
      entrenadorId: req.entrenadorId,
      notas: data.notas,
    });

    await registrarAuditoria({
      entrenadorId: req.entrenadorId!,
      clienteId: String(cliente._id),
      accion: 'creacion',
      entidad: 'PlanAsignacion',
      entidadId: String(asignacion._id),
      req,
    });

    res.status(201).json({ ok: true, data: asignacion });
  })
);

planesRouter.get(
  '/cliente/:clienteId',
  asyncHandler(async (req: Request, res: Response) => {
    const clienteId = paramId(req.params.clienteId);
    const cliente = await Cliente.findOne({
      _id: clienteId,
      entrenadorId: req.entrenadorId,
    });
    if (!cliente) throw new AppError('Cliente no encontrado', 404);

    const items = await PlanAsignacion.find({
      clienteId,
      entrenadorId: req.entrenadorId,
      activo: true,
    })
      .populate('planId')
      .sort({ asignadoEn: -1 })
      .lean();

    res.json({ ok: true, data: items });
  })
);
