import { getCache } from '../config/redis.js';
import { QUEUE_REPORTES, ReporteJob } from '../services/reporteQueue.js';
import { procesarJobReporte, SocketEmitter } from '../services/reporteService.js';

let running = false;

export async function startReporteWorker(emit?: SocketEmitter): Promise<void> {
  if (running) return;
  running = true;
  console.log('[worker-reportes] iniciado');

  const loop = async () => {
    while (running) {
      try {
        const result = await getCache().brpop(QUEUE_REPORTES, 5);
        if (!result) continue;
        const [, raw] = result;
        const job = JSON.parse(raw) as ReporteJob;
        console.log(`[worker-reportes] procesando ${job.evaluacionId} (attempt ${(job.attempts || 0) + 1})`);
        await procesarJobReporte(job, emit);
      } catch (err) {
        console.error('[worker-reportes] error loop:', (err as Error).message);
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  };

  void loop();
}

export function stopReporteWorker(): void {
  running = false;
}

// Standalone entry
if (process.argv[1]?.includes('worker-reportes')) {
  const { connectMongo } = await import('../config/mongo.js');
  const { connectRedis } = await import('../config/redis.js');
  const { configureCloudinary } = await import('../config/cloudinary.js');
  await connectMongo();
  await connectRedis();
  configureCloudinary();
  await startReporteWorker();
}
