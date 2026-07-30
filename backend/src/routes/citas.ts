import { Router, Request, Response } from 'express';
import { Cita } from '../models/Cita.js';
import { Cliente } from '../models/Cliente.js';
import { requireAuth } from '../middlewares/auth.js';
import { AppError, asyncHandler } from '../middlewares/errorHandler.js';
import { parseBody, citaSchema } from '../validators/schemas.js';
import { paramId } from '../utils/params.js';

export const citasRouter = Router();
citasRouter.use(requireAuth);

citasRouter.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const from = req.query.from ? new Date(String(req.query.from)) : undefined;
    const to = req.query.to ? new Date(String(req.query.to)) : undefined;
    const q: Record<string, unknown> = { entrenadorId: req.entrenadorId };
    if (from || to) {
      q.fecha = {};
      if (from) (q.fecha as Record<string, Date>).$gte = from;
      if (to) (q.fecha as Record<string, Date>).$lte = to;
    }
    const items = await Cita.find(q)
      .populate('clienteId', 'nombre codigoCliente telefono email')
      .sort({ fecha: 1 })
      .lean();
    res.json({ ok: true, data: items });
  })
);

citasRouter.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const data = parseBody(citaSchema, req.body);
    const cliente = await Cliente.findOne({
      _id: data.clienteId,
      entrenadorId: req.entrenadorId,
      activo: true,
    });
    if (!cliente) throw new AppError('Cliente no encontrado', 404);

    const cita = await Cita.create({
      entrenadorId: req.entrenadorId,
      clienteId: data.clienteId,
      fecha: data.fecha,
      notas: data.notas,
      estado: data.estado || 'programada',
    });
    res.status(201).json({ ok: true, data: cita });
  })
);

citasRouter.put(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const data = parseBody(citaSchema.partial(), req.body);
    const cita = await Cita.findOneAndUpdate(
      { _id: paramId(req.params.id), entrenadorId: req.entrenadorId },
      { $set: data },
      { new: true }
    );
    if (!cita) throw new AppError('Cita no encontrada', 404);
    res.json({ ok: true, data: cita });
  })
);

citasRouter.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const cita = await Cita.findOneAndUpdate(
      { _id: paramId(req.params.id), entrenadorId: req.entrenadorId },
      { $set: { estado: 'cancelada' } },
      { new: true }
    );
    if (!cita) throw new AppError('Cita no encontrada', 404);
    res.json({ ok: true, data: { id: cita._id } });
  })
);
