interface ScoreGaugeProps {
  value: number;
  delta?: number;
  size?: number;
  label?: string;
}

/** SVG ring gauge 0–100 for physical score. */
export function ScoreGauge({ value, delta, size = 120, label = 'Score físico' }: ScoreGaugeProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (clamped / 100) * c;
  const color = clamped >= 70 ? '#22c55e' : clamped >= 45 ? '#0c83f4' : '#f59e0b';

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-2xl font-bold panel-text">{clamped}%</span>
          {typeof delta === 'number' && delta !== 0 && (
            <span className={`text-xs font-semibold ${delta > 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {delta > 0 ? '+' : ''}
              {delta}
            </span>
          )}
        </div>
      </div>
      <p className="panel-muted text-center text-[10px] uppercase tracking-wider">{label}</p>
    </div>
  );
}
