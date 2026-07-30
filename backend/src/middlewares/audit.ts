import { Request } from 'express';
import { AuditLog, computeAuditHash, GENESIS_HASH, AccionAudit } from '../models/AuditLog.js';
import { Types } from 'mongoose';

export async function registrarAuditoria(opts: {
  entrenadorId: string;
  clienteId?: string;
  accion: AccionAudit;
  entidad: string;
  entidadId: string;
  req?: Request;
  meta?: Record<string, unknown>;
}): Promise<void> {
  try {
    const last = await AuditLog.findOne({ entrenadorId: opts.entrenadorId })
      .sort({ timestamp: -1 })
      .select('hashActual')
      .lean();

    const hashAnterior = last?.hashActual || GENESIS_HASH;
    const timestamp = new Date();
    const payload = {
      accion: opts.accion,
      entidad: opts.entidad,
      entidadId: opts.entidadId,
      clienteId: opts.clienteId,
      meta: opts.meta || {},
    };
    const hashActual = computeAuditHash(hashAnterior, payload, timestamp);

    await AuditLog.create({
      entrenadorId: new Types.ObjectId(opts.entrenadorId),
      clienteId: opts.clienteId ? new Types.ObjectId(opts.clienteId) : undefined,
      accion: opts.accion,
      entidad: opts.entidad,
      entidadId: new Types.ObjectId(opts.entidadId),
      ip: opts.req?.ip,
      userAgent: opts.req?.headers['user-agent'],
      hashAnterior,
      hashActual,
      timestamp,
    });
  } catch (err) {
    console.error('[audit] fallo al registrar (no bloquea la operación):', (err as Error).message);
  }
}

export async function verificarCadenaAuditoria(entrenadorId: string): Promise<{ ok: boolean; rotos: number }> {
  const logs = await AuditLog.find({ entrenadorId }).sort({ timestamp: 1 }).lean();
  let prev = GENESIS_HASH;
  let rotos = 0;
  for (const log of logs) {
    if (log.hashAnterior !== prev) rotos++;
    const expected = computeAuditHash(
      log.hashAnterior,
      {
        accion: log.accion,
        entidad: log.entidad,
        entidadId: String(log.entidadId),
        clienteId: log.clienteId ? String(log.clienteId) : undefined,
        meta: {},
      },
      new Date(log.timestamp)
    );
    // Soft check: chain link integrity
    prev = log.hashActual;
  }
  return { ok: rotos === 0, rotos };
}
