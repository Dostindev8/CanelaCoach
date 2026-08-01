import argon2 from 'argon2';

/** Shared Argon2id settings — trainers and clients use the same policy. */
const ARGON2_OPTS: argon2.Options & { raw?: false } = {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 1,
};

export async function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, ARGON2_OPTS);
}

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    return false;
  }
}

/** Zod-friendly strength rule: ≥10 chars, upper, digit, symbol. */
export const PASSWORD_STRENGTH_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{10,128}$/;

export function passwordStrengthLabel(password: string): 'debil' | 'media' | 'fuerte' {
  let score = 0;
  if (password.length >= 10) score += 1;
  if (password.length >= 14) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  if (score >= 5) return 'fuerte';
  if (score >= 3) return 'media';
  return 'debil';
}
