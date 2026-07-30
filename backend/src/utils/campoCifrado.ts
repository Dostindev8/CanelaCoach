import crypto from 'crypto';
import { env } from '../config/env.js';

const ALGO = 'aes-256-gcm';

function getKey(): Buffer {
  const hex = env.fieldEncryptionKey;
  if (hex && hex.length === 64 && /^[0-9a-fA-F]+$/.test(hex)) {
    return Buffer.from(hex, 'hex');
  }
  if (env.nodeEnv === 'production') {
    throw new Error('[crypto] FIELD_ENCRYPTION_KEY inválida en producción');
  }
  // Dev fallback — deterministic from a fixed seed so seed data survives restarts
  return crypto.createHash('sha256').update('canela-coach-dev-field-key').digest();
}

export function cifrarCampo(texto: string): string {
  if (!texto) return texto;
  if (esCifrado(texto)) return texto; // idempotent — avoid double-encrypt
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const enc = Buffer.concat([cipher.update(texto, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

export function descifrarCampo(payload: string): string {
  if (!payload) return payload;
  try {
    const buf = Buffer.from(payload, 'base64');
    if (buf.length < 28) return payload; // not encrypted
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const enc = buf.subarray(28);
    const decipher = crypto.createDecipheriv(ALGO, getKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
  } catch {
    return payload; // plaintext legacy
  }
}

export function esCifrado(payload: string): boolean {
  if (!payload || payload.length < 40) return false;
  try {
    const buf = Buffer.from(payload, 'base64');
    return buf.length >= 28;
  } catch {
    return false;
  }
}

const SENSITIVE_KEYS = ['enfermedades', 'cirugias', 'lesiones', 'medicamentos', 'alergias'] as const;

export function cifrarAntecedentes(antecedentes?: Record<string, string | undefined> | null) {
  if (!antecedentes) return antecedentes;
  const out: Record<string, string> = {};
  for (const key of SENSITIVE_KEYS) {
    const val = antecedentes[key];
    if (typeof val === 'string' && val.length > 0) {
      out[key] = cifrarCampo(val);
    }
  }
  return out;
}

export function descifrarAntecedentes(antecedentes?: Record<string, string | undefined> | null) {
  if (!antecedentes) return antecedentes;
  const out: Record<string, string> = {};
  for (const key of SENSITIVE_KEYS) {
    const val = antecedentes[key];
    if (typeof val === 'string' && val.length > 0) {
      out[key] = descifrarCampo(val);
    }
  }
  return out;
}
