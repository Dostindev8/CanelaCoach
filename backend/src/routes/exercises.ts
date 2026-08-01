import { Router, Request, Response } from 'express';
import { Exercise, Routine } from '../models/Exercise.js';
import { Cliente } from '../models/Cliente.js';
import { requireAuth } from '../middlewares/auth.js';
import { AppError, asyncHandler } from '../middlewares/errorHandler.js';
import { parseBody, exerciseSchema, routineSchema } from '../validators/schemas.js';
import { entrenadorScope, isAdmin } from '../utils/accessScope.js';
import { getVideoUploadSignature, getSignedVideoUrl } from '../services/videoAccessService.js';
import { paramId } from '../utils/params.js';
import { strictRateLimiter } from '../middlewares/antiHacking.js';

export const exercisesRouter = Router();
exercisesRouter.use(requireAuth, strictRateLimiter);

exercisesRouter.post(
  '/upload-signature',
  asyncHandler(async (_req: Request, res: Response) => {
    res.json({ ok: true, data: getVideoUploadSignature() });
  })
);

exercisesRouter.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const filter = isAdmin(req) ? {} : { createdBy: req.entrenadorId };
    const items = await Exercise.find(filter).sort({ updatedAt: -1 }).lean();
    res.json({ ok: true, data: items });
  })
);

exercisesRouter.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const data = parseBody(exerciseSchema, req.body);
    const exercise = await Exercise.create({
      ...data,
      createdBy: req.entrenadorId,
      isTemplate: data.isTemplate !== false,
    });
    res.status(201).json({ ok: true, data: exercise });
  })
);

exercisesRouter.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const id = paramId(req.params.id);
    const exercise = await Exercise.findById(id).select('+videoPublicId').lean();
    if (!exercise) throw new AppError('Ejercicio no encontrado', 404);
    if (!isAdmin(req) && String(exercise.createdBy) !== String(req.entrenadorId)) {
      throw new AppError('Ejercicio no encontrado', 404);
    }
    const signed = getSignedVideoUrl(exercise.videoPublicId, exercise.videoUrl);
    res.json({
      ok: true,
      data: { ...exercise, videoUrl: signed, videoPublicId: undefined },
    });
  })
);

export const routinesRouter = Router();
routinesRouter.use(requireAuth, strictRateLimiter);

routinesRouter.get(
  '/cliente/:clienteId',
  asyncHandler(async (req: Request, res: Response) => {
    const clienteId = paramId(req.params.clienteId);
    const cliente = await Cliente.findOne(
      isAdmin(req) ? { _id: clienteId } : { _id: clienteId, ...entrenadorScope(req) }
    );
    if (!cliente) throw new AppError('Cliente no encontrado', 404);

    const routines = await Routine.find({
      clienteId,
      ...entrenadorScope(req),
    })
      .populate('days.exercises.exercise', 'name muscleGroup thumbnailUrl videoUrl instructions')
      .sort({ updatedAt: -1 })
      .lean();

    res.json({ ok: true, data: routines });
  })
);

routinesRouter.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const data = parseBody(routineSchema, req.body);
    const clienteId = paramId(data.clienteId);
    const cliente = await Cliente.findOne(
      isAdmin(req) ? { _id: clienteId } : { _id: clienteId, entrenadorId: req.entrenadorId }
    );
    if (!cliente) throw new AppError('Cliente no encontrado', 404);

    if (data.isActive !== false) {
      await Routine.updateMany(
        { clienteId, entrenadorId: req.entrenadorId, isActive: true },
        { $set: { isActive: false } }
      );
    }

    const routine = await Routine.create({
      clienteId,
      entrenadorId: req.entrenadorId,
      title: data.title,
      startDate: data.startDate || new Date(),
      isActive: data.isActive !== false,
      days: data.days.map((d) => ({
        dayLabel: d.dayLabel,
        exercises: d.exercises.map((e) => ({
          exercise: e.exerciseId,
          sets: e.sets,
          reps: e.reps,
          restSeconds: e.restSeconds ?? 60,
          notes: e.notes,
        })),
      })),
    });

    const populated = await Routine.findById(routine._id)
      .populate('days.exercises.exercise', 'name muscleGroup thumbnailUrl videoUrl instructions')
      .lean();

    res.status(201).json({ ok: true, data: populated });
  })
);
