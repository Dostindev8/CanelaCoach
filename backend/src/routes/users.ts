import { Router, Request, Response } from 'express';
import multer from 'multer';
import { fileTypeFromBuffer } from 'file-type';
import sharp from 'sharp';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../middlewares/auth.js';
import { asyncHandler, AppError } from '../middlewares/errorHandler.js';
import { Entrenador } from '../models/Entrenador.js';
import { cloudinary, isCloudinaryReady, uploadBuffer } from '../config/cloudinary.js';
import { env } from '../config/env.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const avatarRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: env.nodeEnv === 'production' ? 10 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `avatar:${(req as Request & { entrenadorId?: string }).entrenadorId || req.ip}`,
  message: {
    ok: false,
    error: { message: 'Límite de subidas de avatar alcanzado (10/hora)', code: 'RATE_LIMIT' },
  },
});

export const usersRouter = Router();

usersRouter.patch(
  '/me/avatar',
  requireAuth,
  avatarRateLimit,
  upload.single('avatar'),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) throw new AppError('Archivo requerido', 400);

    const detected = await fileTypeFromBuffer(req.file.buffer);
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!detected || !allowed.includes(detected.mime)) {
      throw new AppError('Archivo rechazado: no es una imagen válida', 400, 'INVALID_FILE');
    }

    const entrenador = await Entrenador.findById(req.entrenadorId);
    if (!entrenador) throw new AppError('No encontrado', 404);

    const cleaned = await sharp(req.file.buffer)
      .rotate()
      .resize({ width: 200, height: 200, fit: 'cover', position: 'attention' })
      .webp({ quality: 85 })
      .toBuffer();

    const publicId = `avatar-${req.entrenadorId}-${Date.now()}`;
    const uploaded = await uploadBuffer(cleaned, {
      folder: 'canela-coach/avatars',
      public_id: publicId,
      resource_type: 'image',
    });

    if (entrenador.photoPublicId && isCloudinaryReady()) {
      try {
        await cloudinary.uploader.destroy(entrenador.photoPublicId);
      } catch {
        // Non-blocking cleanup of previous asset.
      }
    }

    entrenador.photoUrl = uploaded.secure_url;
    entrenador.photoPublicId = uploaded.public_id;
    await entrenador.save();

    res.json({
      ok: true,
      data: {
        photoUrl: entrenador.photoUrl,
        id: entrenador._id,
        nombre: entrenador.nombre,
        email: entrenador.email,
        rol: entrenador.rol,
      },
    });
  })
);
