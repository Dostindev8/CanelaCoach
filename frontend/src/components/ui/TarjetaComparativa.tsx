interface Props {
  label: string;
  actual: number | null | undefined;
  anterior?: number | null;
  delta?: number | null;
  unidad?: string;
  invertido?: boolean; // true si bajar es bueno (peso, grasa)
}

export function TarjetaComparativa({ label, actual, anterior, delta, unidad = '', invertido = false }: Props) {
  const d = delta ?? (actual != null && anterior != null ? +(actual - anterior).toFixed(1) : null);
  const positivo = d != null && (invertido ? d < 0 : d > 0);
  const negativo = d != null && (invertido ? d > 0 : d < 0);
  const color = positivo ? 'panel-positive' : negativo ? 'panel-negative' : 'panel-muted';
  const arrow = d == null ? '' : d > 0 ? '↑' : d < 0 ? '↓' : '→';

  return (
    <div className="card-panel stat-card min-h-[100px] !p-4">
      <p className="panel-muted mb-2 text-xs font-semibold uppercase tracking-wider">{label}</p>
      <p className="panel-text font-display text-3xl font-bold">
        {actual ?? '—'}
        <span className="panel-muted ml-1 font-sans text-base font-normal">{unidad}</span>
      </p>
      {anterior != null && (
        <p className="panel-muted mt-1 text-sm">
          Anterior: {anterior}
          {d != null && (
            <span className={`ml-2 font-semibold ${color}`}>
              {arrow} {d > 0 ? '+' : ''}
              {d}
            </span>
          )}
        </p>
      )}
    </div>
  );
}
