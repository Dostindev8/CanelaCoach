import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import { Cliente } from '../models/Cliente.js';
import { Evaluacion } from '../models/Evaluacion.js';
import { requireAuth } from '../middlewares/auth.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { cacheGet, cacheSet } from '../config/redis.js';

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth);

dashboardRouter.get(
  '/resumen',
  asyncHandler(async (req: Request, res: Response) => {
    const cacheKey = `dashboard:${req.entrenadorId}`;
    const cached = await cacheGet(cacheKey);
    if (cached) {
      return res.json({ ok: true, data: cached, cached: true });
    }

    const entrenadorId = req.entrenadorId!;
    const hace30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [totalClientes, clientesActivos, totalEvaluaciones, ultimasEval] = await Promise.all([
      Cliente.countDocuments({ entrenadorId }),
      Cliente.countDocuments({ entrenadorId, activo: true }),
      Evaluacion.countDocuments({ entrenadorId }),
      Evaluacion.aggregate([
        { $match: { entrenadorId: new Types.ObjectId(entrenadorId) } },
        { $sort: { fecha: -1 } },
        {
          $group: {
            _id: '$clienteId',
            ultimaFecha: { $first: '$fecha' },
            ultimaEvalId: { $first: '$_id' },
          },
        },
      ]),
    ]);

    const clienteIds = ultimasEval.map((u: { _id: unknown }) => u._id);
    const clientesMap = await Cliente.find({
      _id: { $in: clienteIds },
      entrenadorId,
      activo: true,
    })
      .select('nombre codigoCliente fotoPerfilUrl')
      .lean();

    const byId = new Map(clientesMap.map((c) => [String(c._id), c]));

    type ReevalItem = {
      clienteId: unknown;
      nombre: string;
      codigoCliente: string;
      fotoPerfilUrl?: string;
      ultimaEvaluacion: Date;
      diasSinEvaluacion: number;
    };

    const necesitanReevaluacion: ReevalItem[] = ultimasEval
      .filter((u: { ultimaFecha: Date }) => new Date(u.ultimaFecha) < hace30)
      .map((u: { _id: unknown; ultimaFecha: Date; ultimaEvalId: unknown }): ReevalItem | null => {
        const c = byId.get(String(u._id));
        if (!c) return null;
        const dias = Math.floor((Date.now() - new Date(u.ultimaFecha).getTime()) / 86400000);
        return {
          clienteId: u._id,
          nombre: c.nombre,
          codigoCliente: c.codigoCliente,
          fotoPerfilUrl: c.fotoPerfilUrl,
          ultimaEvaluacion: u.ultimaFecha,
          diasSinEvaluacion: dias,
        };
      })
      .filter((x: ReevalItem | null): x is ReevalItem => x !== null)
      .sort((a, b) => b.diasSinEvaluacion - a.diasSinEvaluacion)
      .slice(0, 20);

    // Clients with zero evaluations
    const sinEval = await Cliente.find({
      entrenadorId,
      activo: true,
      _id: { $nin: clienteIds },
    })
      .select('nombre codigoCliente createdAt')
      .limit(10)
      .lean();

    const evaluacionesMes = await Evaluacion.countDocuments({
      entrenadorId,
      fecha: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
    });

    const scoreAgg = await Evaluacion.aggregate([
      { $match: { entrenadorId: new Types.ObjectId(entrenadorId), 'scoreFisico.valor': { $ne: null } } },
      { $sort: { fecha: -1 } },
      {
        $group: {
          _id: '$clienteId',
          score: { $first: '$scoreFisico.valor' },
          ultimaFecha: { $first: '$fecha' },
        },
      },
    ]);

    const scorePromedio =
      scoreAgg.length > 0
        ? Math.round(
            scoreAgg.reduce((s: number, x: { score: number }) => s + (x.score || 0), 0) / scoreAgg.length
          )
        : null;

    const conEvalReciente = ultimasEval.filter(
      (u: { ultimaFecha: Date }) => new Date(u.ultimaFecha) >= hace30
    ).length;
    const adherenciaPct =
      clientesActivos > 0
        ? Math.round((conEvalReciente / clientesActivos) * 100)
        : 0;

    const data = {
      kpis: {
        totalClientes,
        clientesActivos,
        totalEvaluaciones,
        evaluacionesMes,
        necesitanReevaluacion: necesitanReevaluacion.length + sinEval.length,
        scorePromedio,
        adherencia30d: adherenciaPct,
        clientesConEvalReciente: conEvalReciente,
      },
      necesitanReevaluacion,
      sinEvaluacion: sinEval,
      generadoEn: new Date().toISOString(),
    };

    await cacheSet(cacheKey, data, 60);
    res.json({ ok: true, data, cached: false });
  })
);
