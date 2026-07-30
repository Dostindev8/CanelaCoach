import { Router, Request, Response } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { fileTypeFromBuffer } from 'file-type';
import { Evaluacion } from '../models/Evaluacion.js';
import { Cliente } from '../models/Cliente.js';
import { requireAuth, requireMfaIfMandatory } from '../middlewares/auth.js';
import { AppError, asyncHandler } from '../middlewares/errorHandler.js';
import { parseBody, evaluacionSchema } from '../validators/schemas.js';
import { calcularRatios, construirComparativa, generarReporteMensualFromDocs } from '../services/calculos.js';
import { calcularSumaMedidasCm, PUNTOS_A_MEJORAR_CATALOGO } from '../services/medidas.js';
import { calcularScoreFisico } from '../services/scoreFisico.js';
import { compareEvaluations } from '../services/evaluationComparison.js';
import { aplicarCalculosEvaluacion } from '../services/aplicarCalculosEvaluacion.js';
import { generarReporteMensualPDF } from '../services/pdfReporteMensual.js';
import { generarReporteWordBuffer } from '../services/wordExport.js';
import { CuestionarioIngreso } from '../models/CuestionarioIngreso.js';
import { Report } from '../models/Report.js';
import { registrarAuditoria } from '../middlewares/audit.js';
import { cacheGet, cacheSet, cacheDel, getCache } from '../config/redis.js';
import { uploadBuffer } from '../config/cloudinary.js';
import { encolarReporte } from '../services/reporteQueue.js';
import { enviarReporteCliente } from '../services/notificaciones.js';
import { paramId } from '../utils/params.js';
import { pdfExportRateLimit } from '../middlewares/rateLimit.js';
import { generarEvaluacionFisicaPDF } from '../services/pdfEvaluacionFisica.js';
import { cifrarCampo } from '../utils/campoCifrado.js';
import { kgToLb, lbToKg, detectarDiscrepanciaBascula } from '../theme/canelaCoach.tokens.js';
import { entrenadorScope, isAdmin } from '../utils/accessScope.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
});

/** Soft-deleted clinical rows must never surface */
const ACTIVA = { activo: { $ne: false } } as const;

export const evaluacionesRouter = Router();
evaluacionesRouter.use(requireAuth);
evaluacionesRouter.use(requireMfaIfMandatory);

async function assertClienteOwn(clienteId: string, req: Request) {
  const cliente = await Cliente.findOne(
    isAdmin(req)
      ? { _id: clienteId, activo: true }
      : { _id: clienteId, ...entrenadorScope(req), activo: true }
  );
  if (!cliente) throw new AppError('Cliente no encontrado', 404);
  return cliente;
}

evaluacionesRouter.get(
  '/clientes/:clienteId/evaluaciones',
  asyncHandler(async (req: Request, res: Response) => {
    const clienteId = paramId(req.params.clienteId);
    await assertClienteOwn(clienteId, req);
    const items = await Evaluacion.find({
      clienteId,
      ...entrenadorScope(req),
      activo: { $ne: false },
    })
      .sort({ fecha: -1 })
      .lean();
    res.json({ ok: true, data: items });
  })
);

evaluacionesRouter.get(
  '/clientes/:clienteId/evaluaciones/trend',
  asyncHandler(async (req: Request, res: Response) => {
    const clienteId = paramId(req.params.clienteId);
    await assertClienteOwn(clienteId, req);
    const items = await Evaluacion.find({
      clienteId,
      ...entrenadorScope(req),
      activo: { $ne: false },
    })
      .sort({ fecha: 1 })
      .select('fecha antropometria composicionCorporal resultadosCalculados weightLb smartScale')
      .lean();

    const serie = items.map((e) => ({
      fecha: e.fecha,
      peso: e.antropometria?.peso ?? null,
      weightLb: e.weightLb ?? null,
      grasaCorporalPct:
        e.composicionCorporal?.grasaCorporalPct ??
        e.resultadosCalculados?.porcentajeGrasaCorporal ??
        null,
      masaMuscular:
        e.composicionCorporal?.masaMuscular ?? e.resultadosCalculados?.masaMuscular ?? null,
    }));

    res.json({ ok: true, data: { serie, suficiente: serie.filter((s) => s.peso != null).length >= 2 } });
  })
);

evaluacionesRouter.get(
  '/clientes/:clienteId/evaluaciones/latest',
  asyncHandler(async (req: Request, res: Response) => {
    const clienteId = paramId(req.params.clienteId);
    await assertClienteOwn(clienteId, req);
    const latest = await Evaluacion.findOne({
      clienteId,
      ...entrenadorScope(req),
      activo: { $ne: false },
    })
      .sort({ fecha: -1 })
      .lean();
    res.json({
      ok: true,
      data: latest,
      meta: { puntosAMejorarCatalogo: PUNTOS_A_MEJORAR_CATALOGO },
    });
  })
);

evaluacionesRouter.post(
  '/clientes/:clienteId/evaluaciones',
  asyncHandler(async (req: Request, res: Response) => {
    const clienteId = paramId(req.params.clienteId);
    const cliente = await assertClienteOwn(clienteId, req);
    const data = parseBody(evaluacionSchema, req.body);

    const cuestionario = await CuestionarioIngreso.findOne({ clienteId }).lean();
    const objetivo =
      cuestionario?.objetivoPrincipal ||
      cliente.objetivo ||
      undefined;

    if (data.antropometria) {
      const ratios = calcularRatios(data.antropometria);
      const sumaMedidasCm = calcularSumaMedidasCm(data.antropometria);
      data.antropometria = {
        ...data.antropometria,
        ...ratios,
        ...(sumaMedidasCm != null ? { sumaMedidasCm } : {}),
      } as typeof data.antropometria & { sumaMedidasCm?: number };
    }

    const calc = aplicarCalculosEvaluacion(data as Parameters<typeof aplicarCalculosEvaluacion>[0], {
      edad: cliente.edad,
      sexo: cliente.sexo,
      objetivo: cliente.objetivo,
      fechaNacimiento: cliente.fechaNacimiento,
      objetivoPrincipal: objetivo,
    });
    data.antropometria = calc.antropometria as typeof data.antropometria;
    data.composicionCorporal = calc.composicionCorporal as typeof data.composicionCorporal;

    // Normalize units: kg source of truth; derive lb if missing
    if (data.antropometria?.peso != null && data.weightLb == null) {
      data.weightLb = kgToLb(data.antropometria.peso);
    } else if (data.weightLb != null && data.antropometria?.peso == null) {
      data.antropometria = {
        ...(data.antropometria || {}),
        peso: lbToKg(data.weightLb),
      };
    }

    const bp =
      data.antropometria?.presionArterial ||
      (typeof data.condicionFisica?.presionArterial === 'string'
        ? data.condicionFisica.presionArterial
        : undefined);
    const bloodPressureEnc = bp ? cifrarCampo(String(bp)) : undefined;

    // Sanitize free text (strip angle brackets — XSS; PDF escapes separately)
    if (data.observacionesDesdeUltima) {
      data.observacionesDesdeUltima = String(data.observacionesDesdeUltima)
        .replace(/[<>]/g, '')
        .slice(0, 5000);
    }
    if (data.notasEntrenador) {
      data.notasEntrenador = String(data.notasEntrenador).replace(/[<>]/g, '').slice(0, 5000);
    }
    if (data.puntosAMejorar) {
      data.puntosAMejorar = data.puntosAMejorar.map((p) =>
        String(p).replace(/[<>]/g, '').slice(0, 500)
      );
    }

    const heightCm =
      data.antropometria?.estatura != null
        ? data.antropometria.estatura > 3
          ? data.antropometria.estatura
          : data.antropometria.estatura * 100
        : cliente.estaturaInicial
          ? cliente.estaturaInicial * 100
          : undefined;
    const discrepancia = detectarDiscrepanciaBascula({
      heightCmDevice: data.smartScale?.heightCmDevice,
      heightCmProfile: heightCm,
      ageDeviceEstimate: data.smartScale?.ageDeviceEstimate,
      ageProfile: cliente.edad,
    });

    const count = await Evaluacion.countDocuments({
      clienteId,
      ...entrenadorScope(req),
      activo: { $ne: false },
    });

    const fecha = data.fecha || new Date();
    const anterior = await Evaluacion.obtenerAnterior(clienteId, fecha);

    const score = calcularScoreFisico(
      {
        antropometria: data.antropometria,
        composicionCorporal: data.composicionCorporal,
      },
      anterior
        ? {
            antropometria: anterior.antropometria,
            composicionCorporal: anterior.composicionCorporal,
            scoreFisico: anterior.scoreFisico,
          }
        : null,
      objetivo
    );

    const evaluacion = await Evaluacion.create({
      ...data,
      clienteId,
      entrenadorId: cliente.entrenadorId,
      tipo: data.tipo || (count === 0 ? 'inicial' : 'seguimiento'),
      fecha,
      resultadosCalculados: calc.resultadosCalculados,
      pesoObjetivoEditable: calc.pesoObjetivoEditable,
      bloodPressureEnc,
      activo: true,
      scoreFisico: {
        valor: score.valor,
        delta: score.delta,
        celebracion: score.celebracion,
        motivo: score.motivo,
      },
    });

    // HOOK FUTURO: análisis IA de estancamiento y sugerencias
    // (integrar tras guardar evaluación — leer historial + observacionesCoach)

    await getCache().del(`evaluacion:borrador:${clienteId}:${req.entrenadorId}`);
    await cacheDel(`dashboard:${req.entrenadorId}`);

    await registrarAuditoria({
      entrenadorId: req.entrenadorId!,
      clienteId,
      accion: 'creacion',
      entidad: 'Evaluacion',
      entidadId: String(evaluacion._id),
      req,
    });

    res.status(201).json({
      ok: true,
      data: evaluacion,
      meta: { discrepancia },
    });
  })
);

evaluacionesRouter.get(
  '/evaluaciones/compare',
  asyncHandler(async (req: Request, res: Response) => {
    const fromId = String(req.query.from || '');
    const toId = String(req.query.to || '');
    if (!fromId || !toId) throw new AppError('Parámetros from y to requeridos', 400);

    const [fromEval, toEval] = await Promise.all([
      Evaluacion.findOne({ _id: fromId, ...entrenadorScope(req), ...ACTIVA }).lean(),
      Evaluacion.findOne({ _id: toId, ...entrenadorScope(req), ...ACTIVA }).lean(),
    ]);
    if (!fromEval || !toEval) throw new AppError('Evaluación no encontrada', 404);
    if (String(fromEval.clienteId) !== String(toEval.clienteId)) {
      throw new AppError('Las evaluaciones deben ser del mismo cliente', 400);
    }

    const ordered =
      new Date(fromEval.fecha).getTime() <= new Date(toEval.fecha).getTime()
        ? { anterior: fromEval, actual: toEval }
        : { anterior: toEval, actual: fromEval };

    const comparison = compareEvaluations(
      ordered.anterior as Parameters<typeof compareEvaluations>[0],
      ordered.actual as Parameters<typeof compareEvaluations>[1]
    );

    res.json({ ok: true, data: { comparison, from: ordered.anterior, to: ordered.actual } });
  })
);

evaluacionesRouter.get(
  '/evaluaciones/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const evaluacion = await Evaluacion.findOne({
      _id: paramId(req.params.id),
      ...entrenadorScope(req),
      ...ACTIVA,
    });
    if (!evaluacion) throw new AppError('Evaluación no encontrada', 404);

    await registrarAuditoria({
      entrenadorId: req.entrenadorId!,
      clienteId: String(evaluacion.clienteId),
      accion: 'lectura',
      entidad: 'Evaluacion',
      entidadId: String(evaluacion._id),
      req,
    });

    res.json({ ok: true, data: evaluacion });
  })
);

evaluacionesRouter.put(
  '/evaluaciones/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const data = parseBody(evaluacionSchema, req.body);
    const evaluacion = await Evaluacion.findOne({
      _id: paramId(req.params.id),
      ...entrenadorScope(req),
      ...ACTIVA,
    });
    if (!evaluacion) throw new AppError('Evaluación no encontrada', 404);

    const cliente = await Cliente.findById(evaluacion.clienteId);
    if (!cliente) throw new AppError('Cliente no encontrado', 404);
    const cuestionario = await CuestionarioIngreso.findOne({
      clienteId: evaluacion.clienteId,
    }).lean();
    const objetivo = cuestionario?.objetivoPrincipal || cliente.objetivo || undefined;

    if (data.antropometria) {
      const ratios = calcularRatios(data.antropometria);
      const sumaMedidasCm = calcularSumaMedidasCm(data.antropometria);
      data.antropometria = {
        ...data.antropometria,
        ...ratios,
        ...(sumaMedidasCm != null ? { sumaMedidasCm } : {}),
      } as typeof data.antropometria & { sumaMedidasCm?: number };
    }

    const calc = aplicarCalculosEvaluacion(
      {
        antropometria: (data.antropometria || evaluacion.antropometria) as Record<
          string,
          number | undefined
        >,
        pliegues: (data.pliegues || evaluacion.pliegues) as Record<string, number | undefined>,
        diametrosOseos: (data.diametrosOseos || evaluacion.diametrosOseos) as Record<
          string,
          number | undefined
        >,
        composicionCorporal: (data.composicionCorporal || evaluacion.composicionCorporal) as Record<
          string,
          number | undefined
        >,
        pesoObjetivoEditable: data.pesoObjetivoEditable ?? evaluacion.pesoObjetivoEditable,
      },
      {
        edad: cliente.edad,
        sexo: cliente.sexo,
        objetivo: cliente.objetivo,
        fechaNacimiento: cliente.fechaNacimiento,
        objetivoPrincipal: objetivo,
      }
    );
    data.antropometria = calc.antropometria as typeof data.antropometria;
    data.composicionCorporal = calc.composicionCorporal as typeof data.composicionCorporal;

    Object.assign(evaluacion, data);
    evaluacion.resultadosCalculados = calc.resultadosCalculados as typeof evaluacion.resultadosCalculados;
    evaluacion.pesoObjetivoEditable = calc.pesoObjetivoEditable;

    const anterior = await Evaluacion.obtenerAnterior(evaluacion.clienteId, evaluacion.fecha);
    const score = calcularScoreFisico(
      {
        antropometria: evaluacion.antropometria,
        composicionCorporal: evaluacion.composicionCorporal,
      },
      anterior && String(anterior._id) !== String(evaluacion._id)
        ? {
            antropometria: anterior.antropometria,
            composicionCorporal: anterior.composicionCorporal,
            scoreFisico: anterior.scoreFisico,
          }
        : null,
      objetivo
    );
    evaluacion.scoreFisico = {
      valor: score.valor,
      delta: score.delta,
      celebracion: score.celebracion,
      motivo: score.motivo,
    };

    await evaluacion.save();
    // HOOK FUTURO: análisis IA de estancamiento y sugerencias
    await cacheDel(`dashboard:${req.entrenadorId}`);

    await registrarAuditoria({
      entrenadorId: req.entrenadorId!,
      clienteId: String(evaluacion.clienteId),
      accion: 'edicion',
      entidad: 'Evaluacion',
      entidadId: String(evaluacion._id),
      req,
    });

    res.json({ ok: true, data: evaluacion });
  })
);

evaluacionesRouter.delete(
  '/evaluaciones/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const evaluacion = await Evaluacion.findOne({
      _id: paramId(req.params.id),
      ...entrenadorScope(req),
      activo: { $ne: false },
    });
    if (!evaluacion) throw new AppError('Evaluación no encontrada', 404);
    evaluacion.activo = false;
    evaluacion.deletedAt = new Date();
    await evaluacion.save();
    await cacheDel(`dashboard:${req.entrenadorId}`);

    await registrarAuditoria({
      entrenadorId: req.entrenadorId!,
      clienteId: String(evaluacion.clienteId),
      accion: 'eliminacion',
      entidad: 'Evaluacion',
      entidadId: String(evaluacion._id),
      req,
    });

    res.json({ ok: true, data: { id: evaluacion._id, activo: false } });
  })
);

evaluacionesRouter.get(
  '/evaluaciones/:id/comparativa',
  asyncHandler(async (req: Request, res: Response) => {
    const evaluacion = await Evaluacion.findOne({
      _id: paramId(req.params.id),
      ...entrenadorScope(req),
    }).lean();
    if (!evaluacion) throw new AppError('Evaluación no encontrada', 404);

    const anterior = await Evaluacion.obtenerAnterior(evaluacion.clienteId, evaluacion.fecha);
    const historial = await Evaluacion.find({
      clienteId: evaluacion.clienteId,
      ...entrenadorScope(req),
      ...ACTIVA,
    })
      .sort({ fecha: 1 })
      .select('fecha antropometria composicionCorporal')
      .lean();

    const comparativa = construirComparativa(
      evaluacion as unknown as Record<string, unknown>,
      anterior ? (anterior.toObject() as Record<string, unknown>) : null
    );
    const comparison = compareEvaluations(
      anterior ? (anterior.toObject() as Parameters<typeof compareEvaluations>[0]) : null,
      evaluacion as Parameters<typeof compareEvaluations>[1]
    );
    const reporteMensual = generarReporteMensualFromDocs(historial);

    res.json({
      ok: true,
      data: {
        comparativa,
        comparison,
        reporteMensual,
        suficiente: reporteMensual.suficiente,
        evaluacion,
        anterior: anterior ? anterior.toObject() : null,
      },
    });
  })
);

// Autosave draft every 10s from frontend
evaluacionesRouter.put(
  '/clientes/:clienteId/borrador',
  asyncHandler(async (req: Request, res: Response) => {
    await assertClienteOwn(paramId(req.params.clienteId), req);
    const key = `evaluacion:borrador:${paramId(req.params.clienteId)}:${req.entrenadorId}`;
    await cacheSet(key, req.body, 24 * 60 * 60);
    res.json({ ok: true, data: { savedAt: new Date().toISOString() } });
  })
);

evaluacionesRouter.get(
  '/clientes/:clienteId/borrador',
  asyncHandler(async (req: Request, res: Response) => {
    await assertClienteOwn(paramId(req.params.clienteId), req);
    const key = `evaluacion:borrador:${paramId(req.params.clienteId)}:${req.entrenadorId}`;
    const draft = await cacheGet(key);
    res.json({ ok: true, data: draft });
  })
);

evaluacionesRouter.delete(
  '/clientes/:clienteId/borrador',
  asyncHandler(async (req: Request, res: Response) => {
    await assertClienteOwn(paramId(req.params.clienteId), req);
    const key = `evaluacion:borrador:${paramId(req.params.clienteId)}:${req.entrenadorId}`;
    await getCache().del(key);
    res.json({ ok: true });
  })
);

// Photo upload with magic-byte validation + EXIF strip
evaluacionesRouter.post(
  '/evaluaciones/:id/foto',
  upload.single('foto'),
  asyncHandler(async (req: Request, res: Response) => {
    const tipo = String(req.body.tipo || 'frente') as 'frente' | 'perfilDerecho' | 'espalda';
    if (!['frente', 'perfilDerecho', 'espalda'].includes(tipo)) {
      throw new AppError('Tipo de foto inválido', 400);
    }
    if (!req.file) throw new AppError('Archivo requerido', 400);

    const detected = await fileTypeFromBuffer(req.file.buffer);
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!detected || !allowed.includes(detected.mime)) {
      throw new AppError(
        'Archivo rechazado: no es una imagen válida (magic bytes)',
        400,
        'INVALID_FILE'
      );
    }

    // Re-encode with sharp → strips EXIF/GPS
    const cleaned = await sharp(req.file.buffer)
      .rotate()
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer();

    const evaluacion = await Evaluacion.findOne({
      _id: paramId(req.params.id),
      ...entrenadorScope(req),
      ...ACTIVA,
    });
    if (!evaluacion) throw new AppError('Evaluación no encontrada', 404);

    const uploaded = await uploadBuffer(cleaned, {
      folder: `canela-coach/fotos/${evaluacion.clienteId}`,
      public_id: `${evaluacion._id}-${tipo}`,
      resource_type: 'image',
    });

    const fieldMap = {
      frente: 'frenteUrl',
      perfilDerecho: 'perfilDerechoUrl',
      espalda: 'espaldaUrl',
    } as const;

    evaluacion.fotografias = evaluacion.fotografias || {};
    evaluacion.fotografias[fieldMap[tipo]] = uploaded.secure_url;
    await evaluacion.save();

    res.json({ ok: true, data: { url: uploaded.secure_url, tipo } });
  })
);

evaluacionesRouter.post(
  '/evaluaciones/:id/generar-reporte',
  pdfExportRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    const evaluacion = await Evaluacion.findOne({
      _id: paramId(req.params.id),
      ...entrenadorScope(req),
      activo: { $ne: false },
    });
    if (!evaluacion) throw new AppError('Evaluación no encontrada', 404);

    await encolarReporte({
      evaluacionId: String(evaluacion._id),
      entrenadorId: req.entrenadorId!,
      clienteId: String(evaluacion.clienteId),
    });

    res.json({ ok: true, data: { queued: true, message: 'Reporte en cola de generación' } });
  })
);

evaluacionesRouter.get(
  '/evaluaciones/:id/export.pdf',
  pdfExportRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    const evaluacion = await Evaluacion.findOne({
      _id: paramId(req.params.id),
      ...entrenadorScope(req),
      activo: { $ne: false },
    });
    if (!evaluacion) throw new AppError('Evaluación no encontrada', 404);

    await registrarAuditoria({
      entrenadorId: req.entrenadorId!,
      clienteId: String(evaluacion.clienteId),
      accion: 'lectura',
      entidad: 'EvaluacionPDF',
      entidadId: String(evaluacion._id),
      req,
      meta: { action: 'VIEW_EVALUATION_PDF' },
    });

    const { buffer, filename, url } = await generarEvaluacionFisicaPDF(String(evaluacion._id));
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('X-Pdf-Url', url || '');
    res.send(buffer);
  })
);

evaluacionesRouter.post(
  '/evaluaciones/:id/generar-reporte-mensual',
  asyncHandler(async (req: Request, res: Response) => {
    const evaluacion = await Evaluacion.findOne({
      _id: paramId(req.params.id),
      ...entrenadorScope(req),
      ...ACTIVA,
    });
    if (!evaluacion) throw new AppError('Evaluación no encontrada', 404);

    const url = await generarReporteMensualPDF(String(evaluacion._id));
    res.json({ ok: true, data: { mensualPdfUrl: url } });
  })
);

evaluacionesRouter.get(
  '/evaluaciones/:id/export/docx',
  asyncHandler(async (req: Request, res: Response) => {
    const evaluacion = await Evaluacion.findOne({
      _id: paramId(req.params.id),
      ...entrenadorScope(req),
      ...ACTIVA,
    });
    if (!evaluacion) throw new AppError('Evaluación no encontrada', 404);

    const buffer = await generarReporteWordBuffer(String(evaluacion._id));
    const filename = `reporte-canela-${evaluacion._id}.docx`;
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  })
);

evaluacionesRouter.post(
  '/evaluaciones/:id/enviar-reporte',
  asyncHandler(async (req: Request, res: Response) => {
    const evaluacion = await Evaluacion.findOne({
      _id: paramId(req.params.id),
      ...entrenadorScope(req),
      ...ACTIVA,
    });
    if (!evaluacion) throw new AppError('Evaluación no encontrada', 404);
    if (!evaluacion.reporte?.pdfUrl) {
      throw new AppError('El reporte PDF aún no está generado', 409, 'NO_PDF');
    }

    const cliente = await Cliente.findById(evaluacion.clienteId);
    if (!cliente) throw new AppError('Cliente no encontrado', 404);

    const result = await enviarReporteCliente({
      cliente,
      pdfUrl: evaluacion.reporte.pdfUrl,
      entrenadorId: req.entrenadorId!,
    });

    evaluacion.reporte.enviado = true;
    evaluacion.reporte.enviadoEn = new Date();
    await evaluacion.save();

    await Report.create({
      evaluacionId: evaluacion._id,
      clienteId: cliente._id,
      ...entrenadorScope(req),
      tipo: 'clinico',
      pdfUrl: evaluacion.reporte.pdfUrl,
      generadoEn: evaluacion.reporte.generadoEn || new Date(),
      enviadoWhatsApp: !!result.whatsapp,
      enviadoEmail: !!result.email && !result.simulated,
      enviadoEn: new Date(),
    });

    await registrarAuditoria({
      entrenadorId: req.entrenadorId!,
      clienteId: String(cliente._id),
      accion: 'envio_reporte',
      entidad: 'Reporte',
      entidadId: String(evaluacion._id),
      req,
    });

    res.json({ ok: true, data: result });
  })
);
