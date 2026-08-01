import { Router, Request, Response } from 'express';
import { Cliente } from '../models/Cliente.js';
import { Evaluacion } from '../models/Evaluacion.js';
import { Report } from '../models/Report.js';
import { requireClienteAuth } from '../middlewares/clienteAuth.js';
import { AppError, asyncHandler } from '../middlewares/errorHandler.js';
import { registrarAuditoria } from '../middlewares/audit.js';
import { construirComparativa, generarReporteMensualFromDocs } from '../services/calculos.js';
import { computeMembershipStatus } from '../services/membership.js';
import { paramId } from '../utils/params.js';
import { strictRateLimiter } from '../middlewares/antiHacking.js';
import path from 'path';
import fs from 'fs';

export const clientePortalRouter = Router();
clientePortalRouter.use(requireClienteAuth, strictRateLimiter);

clientePortalRouter.get(
  '/perfil',
  asyncHandler(async (req: Request, res: Response) => {
    const cliente = await Cliente.findById(req.clienteAuth!.id)
      .select(
        'nombre email telefono codigoCliente objetivo fotoPerfilUrl edad sexo membershipStatus currentPeriodEnd nextEvaluationDate lastEvaluationDate'
      )
      .lean();
    if (!cliente) throw new AppError('Cliente no encontrado', 404);

    await registrarAuditoria({
      entrenadorId: req.clienteAuth!.entrenadorId,
      clienteId: req.clienteAuth!.id,
      accion: 'lectura',
      entidad: 'ClientePortalPerfil',
      entidadId: req.clienteAuth!.id,
      req,
    });

    res.json({
      ok: true,
      data: {
        ...cliente,
        computedStatus: computeMembershipStatus({
          membershipStatus: cliente.membershipStatus,
          currentPeriodEnd: cliente.currentPeriodEnd,
          gracePeriodDays: 5,
        }),
      },
    });
  })
);

clientePortalRouter.get(
  '/evaluaciones',
  asyncHandler(async (req: Request, res: Response) => {
    const items = await Evaluacion.find({
      clienteId: req.clienteAuth!.id,
      activo: { $ne: false },
    })
      .sort({ fecha: -1 })
      .select(
        'fecha tipo antropometria composicionCorporal resultadosCalculados scoreFisico fotografias objetivosProximoMes'
      )
      .lean();

    await registrarAuditoria({
      entrenadorId: req.clienteAuth!.entrenadorId,
      clienteId: req.clienteAuth!.id,
      accion: 'lectura',
      entidad: 'ClientePortalEvaluaciones',
      entidadId: req.clienteAuth!.id,
      req,
    });

    res.json({ ok: true, data: items });
  })
);

clientePortalRouter.get(
  '/comparativa',
  asyncHandler(async (req: Request, res: Response) => {
    const historial = await Evaluacion.find({
      clienteId: req.clienteAuth!.id,
      activo: { $ne: false },
    })
      .sort({ fecha: -1 })
      .limit(24)
      .lean();

    const actual = historial[0] || null;
    const anterior = historial[1] || null;
    const comparativa = actual
      ? construirComparativa(
          actual as unknown as Record<string, unknown>,
          anterior as unknown as Record<string, unknown> | null
        )
      : null;
    const reporteMensual = generarReporteMensualFromDocs(historial);

    res.json({
      ok: true,
      data: {
        comparativa,
        reporteMensual,
        suficiente: reporteMensual.suficiente,
      },
    });
  })
);

clientePortalRouter.get(
  '/reportes',
  asyncHandler(async (req: Request, res: Response) => {
    const reportes = await Report.find({ clienteId: req.clienteAuth!.id })
      .sort({ generadoEn: -1 })
      .select('tipo pdfUrl generadoEn')
      .lean();

    const evalPdfs = await Evaluacion.find({
      clienteId: req.clienteAuth!.id,
      'reporte.pdfUrl': { $exists: true, $ne: '' },
      activo: { $ne: false },
    })
      .sort({ fecha: -1 })
      .select('fecha reporte.pdfUrl')
      .lean();

    res.json({
      ok: true,
      data: {
        reportes,
        evaluaciones: evalPdfs.map((e) => ({
          id: e._id,
          fecha: e.fecha,
          pdfUrl: e.reporte?.pdfUrl,
        })),
      },
    });
  })
);

clientePortalRouter.get(
  '/reportes/:id/descargar',
  asyncHandler(async (req: Request, res: Response) => {
    const id = paramId(req.params.id);
    const reporte = await Report.findOne({ _id: id, clienteId: req.clienteAuth!.id }).lean();
    if (!reporte?.pdfUrl) {
      const evaluacion = await Evaluacion.findOne({
        _id: id,
        clienteId: req.clienteAuth!.id,
        activo: { $ne: false },
      })
        .select('reporte.pdfUrl')
        .lean();
      if (!evaluacion?.reporte?.pdfUrl) throw new AppError('Reporte no encontrado', 404);
      res.redirect(evaluacion.reporte.pdfUrl);
      return;
    }

    if (reporte.pdfUrl.startsWith('http')) {
      res.redirect(reporte.pdfUrl);
      return;
    }

    const local = path.resolve(reporte.pdfUrl);
    if (!fs.existsSync(local)) throw new AppError('Archivo no disponible', 404);
    res.download(local);
  })
);
