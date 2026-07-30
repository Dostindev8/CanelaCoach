import { useEffect } from 'react';

interface CelebrationOverlayProps {
  open: boolean;
  score: number;
  delta: number;
  motivo: string;
  onClose: () => void;
}

export function CelebrationOverlay({ open, score, delta, motivo, onClose }: CelebrationOverlayProps) {
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(onClose, 3200);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Celebración de progreso"
      onClick={onClose}
    >
      <div
        className="card-panel relative max-w-sm overflow-hidden text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          {Array.from({ length: 18 }).map((_, i) => (
            <span
              key={i}
              className="absolute h-2 w-2 animate-pulse rounded-full bg-accent"
              style={{
                left: `${(i * 17) % 100}%`,
                top: `${(i * 29) % 100}%`,
                opacity: 0.35 + (i % 5) * 0.1,
                animationDelay: `${i * 80}ms`,
              }}
            />
          ))}
        </div>
        <p className="font-display text-2xl tracking-wider text-accent">¡EXCELENTE PROGRESO!</p>
        <p className="panel-text mt-3 text-4xl font-bold">{score}%</p>
        {delta !== 0 && (
          <p className={`mt-1 text-sm font-semibold ${delta > 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
            {delta > 0 ? '+' : ''}
            {delta} puntos
          </p>
        )}
        <p className="panel-muted mt-3 text-sm leading-relaxed">{motivo}</p>
        <button type="button" className="btn-primary mt-5 w-full" onClick={onClose}>
          Continuar
        </button>
      </div>
    </div>
  );
}
