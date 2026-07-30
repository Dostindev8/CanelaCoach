export const canelaCoachTokens = {
  navy: '#0B1220',
  accent: '#2E9BE6',
  accentBright: '#0C83F4',
  silver: '#9AA5B1',
} as const;

export function detectarDiscrepanciaBascula(opts: {
  heightCmDevice?: number | null;
  heightCmProfile?: number | null;
  ageDeviceEstimate?: number | null;
  ageProfile?: number | null;
}): { show: boolean; mensajes: string[] } {
  const mensajes: string[] = [];
  if (
    opts.heightCmDevice != null &&
    opts.heightCmProfile != null &&
    Math.abs(opts.heightCmDevice - opts.heightCmProfile) > 3
  ) {
    mensajes.push(
      `Báscula: ${opts.heightCmDevice} cm vs perfil: ${opts.heightCmProfile} cm. No se sobrescribe el perfil.`
    );
  }
  if (
    opts.ageDeviceEstimate != null &&
    opts.ageProfile != null &&
    Math.abs(opts.ageDeviceEstimate - opts.ageProfile) > 2
  ) {
    mensajes.push(
      `Báscula estimó ${opts.ageDeviceEstimate} años vs edad ${opts.ageProfile}. Solo informativo.`
    );
  }
  return { show: mensajes.length > 0, mensajes };
}

/** Display helper: null → "Pendiente" */
export function pendiente(v: unknown, unit = ''): string {
  if (v == null || v === '') return 'Pendiente';
  return unit ? `${v} ${unit}` : String(v);
}
