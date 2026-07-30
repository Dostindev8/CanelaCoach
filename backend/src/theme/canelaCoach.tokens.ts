/**
 * Brand tokens for Canela Coach — single source for app + PDF.
 * Extracted from existing index.css / pdfReporte palette (do not invent new hex).
 */
export const canelaCoachTokens = {
  navy: '#0B1220',
  accent: '#2E9BE6',
  accentBright: '#0C83F4',
  accentDeep: '#01469B',
  silver: '#9AA5B1',
  light: '#F4F7FA',
  success: '#3FA65B',
  warn: '#E0A72E',
  error: '#D64545',
  white: '#FFFFFF',
  panelBg: '#05070C',
  panelCard: 'rgba(11, 18, 32, 0.78)',
  fonts: {
    display: 'Oswald, Impact, sans-serif',
    body: 'DM Sans, Segoe UI, system-ui, sans-serif',
  },
} as const;

export type SmartScaleStatus = 'Bajo' | 'Saludable' | 'Alto' | 'Obeso';
export type ProtocolStatus = 'draft' | 'active' | 'archived';
export type AttachmentKind = 'front' | 'back' | 'profile' | 'scale_screenshot';

export const LB_PER_KG = 2.20462;

export function kgToLb(kg: number): number {
  return +(kg * LB_PER_KG).toFixed(1);
}

export function lbToKg(lb: number): number {
  return +(lb / LB_PER_KG).toFixed(2);
}

/** Detect smart-scale vs profile discrepancy (non-blocking banner). */
export function detectarDiscrepanciaBascula(opts: {
  heightCmDevice?: number | null;
  heightCmProfile?: number | null;
  ageDeviceEstimate?: number | null;
  ageProfile?: number | null;
}): { altura: boolean; edad: boolean; mensajes: string[] } {
  const mensajes: string[] = [];
  const altura =
    opts.heightCmDevice != null &&
    opts.heightCmProfile != null &&
    Math.abs(opts.heightCmDevice - opts.heightCmProfile) > 3;
  const edad =
    opts.ageDeviceEstimate != null &&
    opts.ageProfile != null &&
    Math.abs(opts.ageDeviceEstimate - opts.ageProfile) > 2;
  if (altura) {
    mensajes.push(
      `La báscula reportó ${opts.heightCmDevice} cm vs perfil ${opts.heightCmProfile} cm. No se sobrescribe el perfil.`
    );
  }
  if (edad) {
    mensajes.push(
      `La báscula estimó ${opts.ageDeviceEstimate} años vs edad del cliente ${opts.ageProfile}. Dato solo informativo.`
    );
  }
  return { altura, edad, mensajes };
}

export function calcularSumaMedidasBody(m?: {
  neck?: number | null;
  torso?: number | null;
  biceps?: number | null;
  waist?: number | null;
  glutes?: number | null;
  quadriceps?: number | null;
  calves?: number | null;
  cuello?: number | null;
  torax?: number | null;
  cintura?: number | null;
  gluteos?: number | null;
  cuadriceps?: number | null;
  pantorrilla?: number | null;
} | null): number {
  if (!m) return 0;
  const keys = [
    m.neck ?? m.cuello,
    m.torso ?? m.torax,
    m.biceps,
    m.waist ?? m.cintura,
    m.glutes ?? m.gluteos,
    m.quadriceps ?? m.cuadriceps,
    m.calves ?? m.pantorrilla,
  ];
  return keys.reduce((s: number, v) => s + (typeof v === 'number' && Number.isFinite(v) ? v : 0), 0);
}
