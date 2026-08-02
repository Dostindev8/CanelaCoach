const STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/40',
  inactive: 'bg-red-500/15 text-red-300 border-red-400/40',
  paused: 'bg-amber-500/15 text-amber-300 border-amber-400/40',
  cancelled: 'bg-white/10 text-white/50 border-white/20',
  success: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/40',
  warn: 'bg-amber-500/15 text-amber-300 border-amber-400/40',
  danger: 'bg-red-500/15 text-red-300 border-red-400/40',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Activo',
  inactive: 'Pago pendiente',
  paused: 'Pausado',
  cancelled: 'Cancelado',
  success: 'OK',
  warn: 'Alerta',
  danger: 'Crítico',
};

export type StatusBadgeStatus = keyof typeof STATUS_STYLES;

/** Pill + color dot — same visual language as ClientStatusBadge (reference). */
export function StatusBadge({
  status,
  label,
}: {
  status?: string | null;
  label?: string;
}) {
  const key = status && STATUS_STYLES[status] ? status : 'active';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[key]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {label || STATUS_LABELS[key] || key}
    </span>
  );
}
