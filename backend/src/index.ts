import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { Server as SocketServer } from 'socket.io';
import { env, assertCriticalEnv } from './config/env.js';
import { connectMongo, isDatabaseReady } from './config/mongo.js';
import { connectRedis } from './config/redis.js';
import { configureCloudinary } from './config/cloudinary.js';
import { globalRateLimit, limpiarTodosLosLockouts } from './middlewares/rateLimit.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { authRouter } from './routes/auth.js';
import { clientesRouter } from './routes/clientes.js';
import { evaluacionesRouter } from './routes/evaluaciones.js';
import { dashboardRouter } from './routes/dashboard.js';
import { agenteRouter } from './routes/agente.js';
import { usersRouter } from './routes/users.js';
import { planesRouter } from './routes/planes.js';
import { citasRouter } from './routes/citas.js';
import { portalRouter } from './routes/portal.js';
import { protocolsRouter, supplementCatalogRouter } from './routes/protocols.js';
import { exercisesRouter, routinesRouter } from './routes/exercises.js';
import { clienteAuthRouter } from './routes/clienteAuth.js';
import { clientePortalRouter } from './routes/clientePortal.js';
import { startReporteWorker } from './workers/worker-reportes.js';
import { verifyToken } from './middlewares/auth.js';
import { ensureSeedData, syncDemoCoachProfile, ensureAdminAccess } from './seedData.js';
import { ensureSupplementCatalogSeed } from './seedSupplements.js';
import { registerMembershipStatusJob } from './jobs/membershipStatusJob.js';
import { registerEvaluationReminderJob } from './jobs/evaluationReminderJob.js';
import { detectScrapingPattern } from './middlewares/antiHacking.js';

assertCriticalEnv();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDist = path.resolve(__dirname, '../../frontend/dist');

function configureFrontendHosting(app: express.Express): void {
  if (env.nodeEnv !== 'production') return;
  if (!fs.existsSync(frontendDist)) {
    console.warn('[static] frontend/dist no encontrado — ejecuta npm run build en la raíz antes de desplegar');
    return;
  }

  app.use(
    express.static(frontendDist, {
      index: false,
      maxAge: '1d',
      setHeaders(res, filePath) {
        if (filePath.endsWith('index.html')) {
          res.setHeader('Cache-Control', 'no-cache');
        }
      },
    })
  );

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(frontendDist, 'index.html'), (err) => {
      if (err) next(err);
    });
  });

  console.log('[static] sirviendo frontend desde', frontendDist);
}

export const app = express();
export let io: SocketServer;

// trust proxy MUST be before rate-limit
app.set('trust proxy', 1);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com'],
        mediaSrc: ["'self'", 'https://res.cloudinary.com', 'blob:'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        scriptSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        connectSrc: ["'self'", env.frontendUrl, 'ws:', 'wss:', 'https://res.cloudinary.com'],
      },
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  })
);

app.use(
  cors({
    origin: env.frontendUrl,
    credentials: true,
  })
);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(globalRateLimit);
app.use(detectScrapingPattern);

app.get('/api/health', (_req, res) => {
  const databaseReady = isDatabaseReady();
  res.status(databaseReady ? 200 : 503).json({
    ok: databaseReady,
    service: 'canela-coach-api',
    version: '1.0.0',
    database: databaseReady ? 'ready' : 'unavailable',
    time: new Date().toISOString(),
  });
});

app.use('/api/auth', authRouter);
app.use('/api/clientes', clientesRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/agente', agenteRouter);
app.use('/api/users', usersRouter);
app.use('/api/planes', planesRouter);
app.use('/api/citas', citasRouter);
app.use('/api/portal', portalRouter);
app.use('/api/cliente/auth', clienteAuthRouter);
app.use('/api/cliente/portal', clientePortalRouter);
app.use('/api/supplement-catalog', supplementCatalogRouter);
app.use('/api/clientes/:clienteId/protocols', protocolsRouter);
app.use('/api/exercises', exercisesRouter);
app.use('/api/routines', routinesRouter);
// Evaluaciones last: mounted at /api with shared middlewares — must not shadow other routers
app.use('/api', evaluacionesRouter);

configureFrontendHosting(app);

app.use(errorHandler);

export async function bootstrap(): Promise<http.Server> {
  await connectMongo();
  await connectRedis();
  configureCloudinary();
  await ensureSeedData();
  await ensureSupplementCatalogSeed();
  await syncDemoCoachProfile();
  await ensureAdminAccess();
  if (env.nodeEnv !== 'production') {
    const n = await limpiarTodosLosLockouts();
    if (n > 0) console.log(`[auth] lockouts limpiados en dev: ${n}`);
  }

  registerMembershipStatusJob();
  registerEvaluationReminderJob();

  const server = http.createServer(app);
  io = new SocketServer(server, {
    cors: { origin: env.frontendUrl, credentials: true },
  });

  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.cookie
          ?.split(';')
          .map((c) => c.trim())
          .find((c) => c.startsWith('access_token='))
          ?.split('=')[1];
      if (!token) return next(new Error('Unauthorized'));
      const payload = verifyToken(token);
      (socket as unknown as { entrenadorId: string }).entrenadorId = payload.sub;
      socket.join(`entrenador:${payload.sub}`);
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    console.log('[socket] conectado', (socket as unknown as { entrenadorId: string }).entrenadorId);
  });

  const emit: (entrenadorId: string, event: string, payload: unknown) => void = (
    entrenadorId,
    event,
    payload
  ) => {
    io.to(`entrenador:${entrenadorId}`).emit(event, payload);
  };

  // Inline worker for single-process dev; production can run worker separately
  startReporteWorker(emit).catch((err) => console.error('[worker]', err));

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(
        `[api] Puerto ${env.port} ocupado. Cierra la otra instancia o ejecuta:\n` +
          `  Get-NetTCPConnection -LocalPort ${env.port} -State Listen | % { Stop-Process -Id $_.OwningProcess -Force }`
      );
      process.exit(1);
    }
    console.error('[api] Error al escuchar', err);
    process.exit(1);
  });

  server.listen(env.port, () => {
    console.log(`[api] Canela Coach® escuchando en :${env.port}`);
  });

  return server;
}

// Vitest imports `app` without listening. tsx/node argv varies — do not rely on path includes 'index'.
if (!process.env.VITEST) {
  bootstrap().catch((err) => {
    console.error('Fatal bootstrap error', err);
    process.exit(1);
  });
}
