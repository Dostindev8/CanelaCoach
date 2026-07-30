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
import { parseBody, clienteSchema, cuestionarioIngresoSchema } from '../validators/schemas.js';
import { registrarAuditoria } from '../middlewares/audit.js';
import { cacheDel } from '../config/redis.js';
import { aplicarCuestionarioACliente } from '../services/syncCuestionarioCliente.js';
import { paramId } from '../utils/params.js';

export const clientesRouter = Router();
clientesRouter.use(requireAuth);

async function assertClienteOwn(clienteId: string, entrenadorId: string) {
  const cliente = await Cliente.findOne({ _id: clienteId, entrenadorId });
  if (!cliente) throw new AppError('Cliente no encontrado', 404);
  return cliente;
}

clientesRouter.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const q = String(req.query.q || '').trim();
    const activo = req.query.activo === undefined ? true : req.query.activo === 'true';

    const filter: Record<string, unknown> = {
      entrenadorId: req.entrenadorId,
      activo,
    };
    if (q) {
      filter.$or = [
        { nombre: { $regex: q, $options: 'i' } },
        { codigoCliente: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
      ];
    }

    const [items, total] = await Promise.all([
      Cliente.find(filter)
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select('-antecedentes')
        .lean(),
      Cliente.countDocuments(filter),
    ]);

    res.json({
      ok: true,
      data: {
        items,
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
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
    await assertClienteOwn(clienteId, req.entrenadorId!);
    const doc = await CuestionarioIngreso.findOne({
      clienteId,
      entrenadorId: req.entrenadorId,
    });
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
    const cliente = await assertClienteOwn(clienteId, req.entrenadorId!);
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
      entrenadorId: req.entrenadorId,
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
    const cliente = await assertClienteOwn(clienteId, req.entrenadorId!);
    const doc = await CuestionarioIngreso.findOne({
      clienteId,
      entrenadorId: req.entrenadorId,
    });
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
    const cliente = await Cliente.findOne({ _id: req.params.id, entrenadorId: req.entrenadorId });
    if (!cliente) throw new AppError('Cliente no encontrado', 404);

    const evaluaciones = await Evaluacion.find({
      clienteId: cliente._id,
      entrenadorId: req.entrenadorId,
    })
      .sort({ fecha: -1 })
      .limit(3)
      .lean();

    const tieneCuestionario = !!(await CuestionarioIngreso.exists({
      clienteId: cliente._id,
      entrenadorId: req.entrenadorId,
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
        evaluacionesRecientes: evaluaciones,
        tieneCuestionario,
      },
    });
  })
);

clientesRouter.put(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const data = parseBody(clienteSchema.partial(), req.body);
    const cliente = await Cliente.findOne({ _id: req.params.id, entrenadorId: req.entrenadorId });
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
    const cliente = await assertClienteOwn(clienteId, req.entrenadorId!);
    const [evaluaciones, planes, citas, reportes, cuestionario] = await Promise.all([
      Evaluacion.find({ clienteId, entrenadorId: req.entrenadorId })
        .sort({ fecha: -1 })
        .lean(),
      PlanAsignacion.find({ clienteId, entrenadorId: req.entrenadorId, activo: true })
        .populate('planId')
        .sort({ asignadoEn: -1 })
        .lean(),
      Cita.find({ clienteId, entrenadorId: req.entrenadorId }).sort({ fecha: -1 }).lean(),
      Report.find({ clienteId, entrenadorId: req.entrenadorId }).sort({ generadoEn: -1 }).lean(),
      CuestionarioIngreso.findOne({ clienteId }).lean(),
    ]);

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
      },
    });
  })
);

clientesRouter.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const cliente = await Cliente.findOne({ _id: req.params.id, entrenadorId: req.entrenadorId });
    if (!cliente) throw new AppError('Cliente no encontrado', 404);

    cliente.activo = false;
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

    res.json({ ok: true, data: { id: cliente._id, activo: false } });
  })
);
