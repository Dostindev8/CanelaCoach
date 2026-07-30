import { Router, Request, Response } from 'express';
import multer from 'multer';
import { requireAuth } from '../middlewares/auth.js';
import { agenteRateLimit } from '../middlewares/rateLimit.js';
import { AppError, asyncHandler } from '../middlewares/errorHandler.js';
import { parseBody, agenteMensajeSchema } from '../validators/schemas.js';
import { streamRespuestaAgente, procesarVozStub } from '../services/agente.js';
import { ConversacionAgente } from '../models/ConversacionAgente.js';
import { Cliente } from '../models/Cliente.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

export const agenteRouter = Router();
agenteRouter.use(requireAuth);
agenteRouter.use(agenteRateLimit);

agenteRouter.post(
  '/mensaje',
  asyncHandler(async (req: Request, res: Response) => {
    const data = parseBody(agenteMensajeSchema, req.body);

    if (data.clienteId) {
      const ok = await Cliente.exists({ _id: data.clienteId, entrenadorId: req.entrenadorId });
      if (!ok) throw new AppError('Cliente no encontrado', 404);
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    for await (const event of streamRespuestaAgente({
      entrenadorId: req.entrenadorId!,
      clienteId: data.clienteId,
      mensaje: data.mensaje,
      conversacionId: data.conversacionId,
    })) {
      res.write(`event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`);
    }
    res.end();
  })
);

agenteRouter.post(
  '/voz',
  upload.single('audio'),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) throw new AppError('Audio requerido', 400);
    const clienteId = req.body.clienteId as string | undefined;
    if (clienteId) {
      const ok = await Cliente.exists({ _id: clienteId, entrenadorId: req.entrenadorId });
      if (!ok) throw new AppError('Cliente no encontrado', 404);
    }

    const result = await procesarVozStub({
      entrenadorId: req.entrenadorId!,
      clienteId,
      audioBuffer: req.file.buffer,
    });

    // Persist transcription even if audio later expires
    await ConversacionAgente.create({
      entrenadorId: req.entrenadorId,
      clienteId,
      canal: 'voz',
      mensajes: [
        { rol: 'usuario', contenido: result.transcripcion || '[audio inentendible]', timestamp: new Date() },
        { rol: 'agente', contenido: result.respuesta, audioUrl: result.audioUrl, timestamp: new Date() },
      ],
    });

    res.json({ ok: true, data: result });
  })
);

agenteRouter.get(
  '/historial/:clienteId',
  asyncHandler(async (req: Request, res: Response) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Number(req.query.limit) || 10);
    const ok = await Cliente.exists({ _id: req.params.clienteId, entrenadorId: req.entrenadorId });
    if (!ok) throw new AppError('Cliente no encontrado', 404);

    const [items, total] = await Promise.all([
      ConversacionAgente.find({
        entrenadorId: req.entrenadorId,
        clienteId: req.params.clienteId,
      })
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      ConversacionAgente.countDocuments({
        entrenadorId: req.entrenadorId,
        clienteId: req.params.clienteId,
      }),
    ]);

    res.json({ ok: true, data: { items, page, limit, total } });
  })
);

agenteRouter.delete(
  '/historial/:clienteId',
  asyncHandler(async (req: Request, res: Response) => {
    const ok = await Cliente.exists({ _id: req.params.clienteId, entrenadorId: req.entrenadorId });
    if (!ok) throw new AppError('Cliente no encontrado', 404);

    const result = await ConversacionAgente.deleteMany({
      entrenadorId: req.entrenadorId,
      clienteId: req.params.clienteId,
    });

    res.json({ ok: true, data: { eliminadas: result.deletedCount } });
  })
);
