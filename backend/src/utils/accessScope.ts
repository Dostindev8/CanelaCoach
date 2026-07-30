import type { Request } from 'express';

/** Platform admin (full read/write across coaches). */
export function isAdmin(req: Request): boolean {
  return req.user?.rol === 'admin';
}

/**
 * Ownership filter: coaches are scoped to themselves; admins see all.
 * Spread into Mongo queries: `{ ...entrenadorScope(req), activo: true }`
 */
export function entrenadorScope(req: Request): { entrenadorId?: string } {
  if (isAdmin(req)) return {};
  return { entrenadorId: req.entrenadorId };
}

export function withEntrenadorScope(
  req: Request,
  base: Record<string, unknown> = {}
): Record<string, unknown> {
  return { ...base, ...entrenadorScope(req) };
}
