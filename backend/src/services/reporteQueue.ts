import { getCache } from '../config/redis.js';

export const QUEUE_REPORTES = 'queue:reportes';
export const QUEUE_REPORTES_DLQ = 'queue:reportes:dlq';

export interface ReporteJob {
  evaluacionId: string;
  entrenadorId: string;
  clienteId: string;
  attempts?: number;
  enqueuedAt: string;
}

export async function encolarReporte(job: Omit<ReporteJob, 'enqueuedAt' | 'attempts'>): Promise<void> {
  const payload: ReporteJob = {
    ...job,
    attempts: 0,
    enqueuedAt: new Date().toISOString(),
  };
  await getCache().lpush(QUEUE_REPORTES, JSON.stringify(payload));
}

export async function encolarDLQ(job: ReporteJob, error: string): Promise<void> {
  await getCache().lpush(
    QUEUE_REPORTES_DLQ,
    JSON.stringify({ ...job, error, failedAt: new Date().toISOString() })
  );
}
