import { Router, Request, Response } from 'express';
import { Protocol } from '../models/Protocol.js';
import { Cliente } from '../models/Cliente.js';
import { SupplementCatalog } from '../models/SupplementCatalog.js';
import { requireAuth, requireMfaIfMandatory } from '../middlewares/auth.js';
import { AppError, asyncHandler } from '../middlewares/errorHandler.js';
import { parseBody, protocolSchema, supplementCatalogSchema } from '../validators/schemas.js';
import { paramId } from '../utils/params.js';
import { registrarAuditoria } from '../middlewares/audit.js';
import { pdfExportRateLimit } from '../middlewares/rateLimit.js';
import { generarProtocoloPDF } from '../services/pdfProtocolo.js';
import { entrenadorScope, isAdmin } from '../utils/accessScope.js';

export const protocolsRouter = Router({ mergeParams: true });
protocolsRouter.use(requireAuth);
protocolsRouter.use(requireMfaIfMandatory);

async function assertClienteOwn(clienteId: string, req: import('express').Request) {
  const cliente = await Cliente.findOne(
    isAdmin(req)
      ? { _id: clienteId, activo: true }
      : { _id: clienteId, ...entrenadorScope(req), activo: true }
  );
  if (!cliente) throw new AppError('Cliente no encontrado', 404);
  return cliente;
}

protocolsRouter.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const clienteId = paramId(req.params.clienteId);
    await assertClienteOwn(clienteId, req);
    const items = await Protocol.find({
      clienteId,
      ...entrenadorScope(req),
      deletedAt: null,
    })
      .sort({ version: -1 })
      .lean();
    res.json({ ok: true, data: items });
  })
);

protocolsRouter.get(
  '/active',
  asyncHandler(async (req: Request, res: Response) => {
    const clienteId = paramId(req.params.clienteId);
    await assertClienteOwn(clienteId, req);
    const active = await Protocol.findOne({
      clienteId,
      ...entrenadorScope(req),
      status: 'active',
      deletedAt: null,
    }).lean();
    res.json({ ok: true, data: active });
  })
);

protocolsRouter.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const clienteId = paramId(req.params.clienteId);
    const cliente = await assertClienteOwn(clienteId, req);
    const data = parseBody(protocolSchema, req.body);

    const last = await Protocol.findOne({ clienteId, ...entrenadorScope(req) })
      .sort({ version: -1 })
      .select('version')
      .lean();

    const protocol = await Protocol.create({
      clienteId,
      entrenadorId: cliente.entrenadorId,
      createdBy: req.entrenadorId,
      version: (last?.version || 0) + 1,
      status: 'draft',
      objective: {
        initialWeightLb: data.objective?.initialWeightLb ?? null,
        currentWeightLb: data.objective?.currentWeightLb ?? null,
        goals: data.objective?.goals || [],
      },
      weeklyMenu: {
        patternDayMap: data.weeklyMenu?.patternDayMap || {},
        mealPatternA: data.weeklyMenu?.mealPatternA || {},
        mealPatternB: data.weeklyMenu?.mealPatternB || {},
        snacksOptional: data.weeklyMenu?.snacksOptional || [],
      },
      supplementation: data.supplementation || [],
      biohacking: {
        yes: data.biohacking?.yes || [],
        no: data.biohacking?.no || [],
      },
    });

    await registrarAuditoria({
      entrenadorId: req.entrenadorId!,
      clienteId,
      accion: 'creacion',
      entidad: 'Protocol',
      entidadId: String(protocol._id),
      req,
    });

    res.status(201).json({ ok: true, data: protocol });
  })
);

protocolsRouter.patch(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const clienteId = paramId(req.params.clienteId);
    await assertClienteOwn(clienteId, req);
    const data = parseBody(protocolSchema, req.body);

    const protocol = await Protocol.findOne({
      _id: paramId(req.params.id),
      clienteId,
      ...entrenadorScope(req),
      deletedAt: null,
    });
    if (!protocol) throw new AppError('Protocolo no encontrado', 404);

    // Active protocols are never mutated in-place — fork draft version
    if (protocol.status === 'active') {
      const forked = await Protocol.create({
        clienteId: protocol.clienteId,
        entrenadorId: protocol.entrenadorId,
        createdBy: req.entrenadorId,
        version: protocol.version + 1,
        status: 'draft',
        objective: data.objective
          ? {
              initialWeightLb: data.objective.initialWeightLb ?? protocol.objective?.initialWeightLb,
              currentWeightLb: data.objective.currentWeightLb ?? protocol.objective?.currentWeightLb,
              goals: data.objective.goals ?? protocol.objective?.goals ?? [],
            }
          : protocol.objective,
        weeklyMenu: data.weeklyMenu
          ? {
              patternDayMap: data.weeklyMenu.patternDayMap || protocol.weeklyMenu?.patternDayMap,
              mealPatternA: data.weeklyMenu.mealPatternA || protocol.weeklyMenu?.mealPatternA,
              mealPatternB: data.weeklyMenu.mealPatternB || protocol.weeklyMenu?.mealPatternB,
              snacksOptional: data.weeklyMenu.snacksOptional || protocol.weeklyMenu?.snacksOptional,
            }
          : protocol.weeklyMenu,
        supplementation: data.supplementation ?? protocol.supplementation,
        biohacking: data.biohacking
          ? {
              yes: data.biohacking.yes ?? protocol.biohacking?.yes ?? [],
              no: data.biohacking.no ?? protocol.biohacking?.no ?? [],
            }
          : protocol.biohacking,
      });
      return res.status(201).json({
        ok: true,
        data: forked,
        meta: { forkedFrom: protocol._id, message: 'Versión draft creada (activo no se muta)' },
      });
    }

    if (protocol.status !== 'draft') {
      throw new AppError('Solo se pueden editar borradores', 400);
    }

    // Optimistic concurrency
    if (data.updatedAt && protocol.updatedAt) {
      const clientTs = new Date(data.updatedAt).getTime();
      const serverTs = new Date(protocol.updatedAt).getTime();
      if (clientTs < serverTs) {
        throw new AppError('Conflicto de versión — recarga el borrador', 409, 'CONFLICT');
      }
    }

    if (data.objective) {
      protocol.objective = {
        initialWeightLb: data.objective.initialWeightLb ?? protocol.objective?.initialWeightLb,
        currentWeightLb: data.objective.currentWeightLb ?? null,
        goals: data.objective.goals ?? protocol.objective?.goals ?? [],
      };
    }
    if (data.weeklyMenu) {
      protocol.weeklyMenu = {
        patternDayMap: data.weeklyMenu.patternDayMap || protocol.weeklyMenu?.patternDayMap || {},
        mealPatternA: data.weeklyMenu.mealPatternA || protocol.weeklyMenu?.mealPatternA,
        mealPatternB: data.weeklyMenu.mealPatternB || protocol.weeklyMenu?.mealPatternB,
        snacksOptional: data.weeklyMenu.snacksOptional || protocol.weeklyMenu?.snacksOptional || [],
      };
    }
    if (data.supplementation) protocol.supplementation = data.supplementation;
    if (data.biohacking) {
      protocol.biohacking = {
        yes: data.biohacking.yes || [],
        no: data.biohacking.no || [],
      };
    }

    await protocol.save();
    await registrarAuditoria({
      entrenadorId: req.entrenadorId!,
      clienteId,
      accion: 'edicion',
      entidad: 'Protocol',
      entidadId: String(protocol._id),
      req,
    });
    res.json({ ok: true, data: protocol });
  })
);

protocolsRouter.post(
  '/:id/publish',
  asyncHandler(async (req: Request, res: Response) => {
    const clienteId = paramId(req.params.clienteId);
    await assertClienteOwn(clienteId, req);
    const protocol = await Protocol.findOne({
      _id: paramId(req.params.id),
      clienteId,
      ...entrenadorScope(req),
      status: 'draft',
      deletedAt: null,
    });
    if (!protocol) throw new AppError('Borrador no encontrado', 404);

    await Protocol.updateMany(
      {
        clienteId,
        ...entrenadorScope(req),
        status: 'active',
        _id: { $ne: protocol._id },
      },
      { $set: { status: 'archived' } }
    );

    protocol.status = 'active';
    await protocol.save();

    await registrarAuditoria({
      entrenadorId: req.entrenadorId!,
      clienteId,
      accion: 'edicion',
      entidad: 'Protocol',
      entidadId: String(protocol._id),
      req,
      meta: { action: 'publish', version: protocol.version },
    });

    res.json({ ok: true, data: protocol });
  })
);

protocolsRouter.get(
  '/:id/export.pdf',
  pdfExportRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    const clienteId = paramId(req.params.clienteId);
    await assertClienteOwn(clienteId, req);
    const protocol = await Protocol.findOne({
      _id: paramId(req.params.id),
      clienteId,
      ...entrenadorScope(req),
      deletedAt: null,
    });
    if (!protocol) throw new AppError('Protocolo no encontrado', 404);

    const { buffer, filename } = await generarProtocoloPDF(String(protocol._id));
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  })
);

// ─── Supplement catalog (coach-scoped shared catalog) ───
export const supplementCatalogRouter = Router();
supplementCatalogRouter.use(requireAuth);

supplementCatalogRouter.get(
  '/',
  asyncHandler(async (_req: Request, res: Response) => {
    const items = await SupplementCatalog.find({ active: true }).sort({ name: 1 }).lean();
    res.json({ ok: true, data: items });
  })
);

supplementCatalogRouter.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const data = parseBody(supplementCatalogSchema, req.body);
    const exists = await SupplementCatalog.findOne({ sku: data.sku.toLowerCase() });
    if (exists) throw new AppError('SKU ya existe', 409);
    const item = await SupplementCatalog.create({
      ...data,
      sku: data.sku.toLowerCase(),
      benefits: data.benefits || [],
      indications: data.indications || [],
    });
    res.status(201).json({ ok: true, data: item });
  })
);

supplementCatalogRouter.patch(
  '/:sku',
  asyncHandler(async (req: Request, res: Response) => {
    const data = parseBody(supplementCatalogSchema.partial(), req.body);
    const item = await SupplementCatalog.findOneAndUpdate(
      { sku: String(req.params.sku).toLowerCase() },
      { $set: data },
      { new: true }
    );
    if (!item) throw new AppError('Suplemento no encontrado', 404);
    res.json({ ok: true, data: item });
  })
);
