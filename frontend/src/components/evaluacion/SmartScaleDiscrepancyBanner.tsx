import { detectarDiscrepanciaBascula } from '../../theme/canelaCoach.tokens';

export function SmartScaleDiscrepancyBanner(props: {
  heightCmDevice?: number | null;
  heightCmProfile?: number | null;
  ageDeviceEstimate?: number | null;
  ageProfile?: number | null;
}) {
  const { show, mensajes } = detectarDiscrepanciaBascula(props);
  if (!show) return null;
  return (
    <div
      className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
      role="status"
    >
      <p className="font-semibold">Discrepancia báscula vs perfil</p>
      <ul className="mt-1 list-disc space-y-1 pl-4 text-xs opacity-90">
        {mensajes.map((m) => (
          <li key={m}>{m}</li>
        ))}
      </ul>
      <p className="mt-2 text-xs opacity-70">
        Puedes guardar igual — el perfil del cliente no se modifica automáticamente.
      </p>
    </div>
  );
}
