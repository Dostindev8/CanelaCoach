import { BrandLogo } from '../ui/BrandLogo';
import { cn } from '../../lib/cn';

function ChevronDecor({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 600 900"
      preserveAspectRatio="xMaxYMid meet"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="chevGlow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0C83F4" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#01469B" stopOpacity="0.2" />
        </linearGradient>
        <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {[0, 28, 56, 84, 112].map((offset, i) => (
        <path
          key={offset}
          d={`M ${40 + offset} 40 L ${220 + offset} 450 L ${40 + offset} 860`}
          fill="none"
          stroke="url(#chevGlow)"
          strokeWidth={i === 0 ? 2.5 : 1.5}
          opacity={1 - i * 0.14}
          filter="url(#softGlow)"
        />
      ))}
    </svg>
  );
}

function DotCorners() {
  return (
    <>
      <div
        className="pointer-events-none absolute left-0 top-0 h-56 w-56 bg-dot-grid bg-dot-grid"
        style={{
          WebkitMaskImage: 'radial-gradient(ellipse at top left, black 25%, transparent 72%)',
          maskImage: 'radial-gradient(ellipse at top left, black 25%, transparent 72%)',
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute bottom-0 right-0 h-64 w-64 bg-dot-grid bg-dot-grid"
        style={{
          WebkitMaskImage: 'radial-gradient(ellipse at bottom right, black 20%, transparent 70%)',
          maskImage: 'radial-gradient(ellipse at bottom right, black 20%, transparent 70%)',
        }}
        aria-hidden="true"
      />
    </>
  );
}

/** Left hero — logo top-left + wordmark, per login-reference.png */
export function BrandHeroPanel({ compact = false }: { compact?: boolean }) {
  return (
    <aside
      className={
        compact
          ? 'relative flex items-center justify-center overflow-hidden'
          : 'relative hidden min-h-0 w-[40%] shrink-0 flex-col justify-between overflow-hidden p-8 xl:w-[42%] xl:p-12 lg:flex'
      }
      aria-hidden={compact ? undefined : true}
    >
      {!compact && (
        <ChevronDecor className="pointer-events-none absolute inset-y-0 -right-[6%] h-full w-[72%] opacity-45" />
      )}

      <div className={cn('relative z-10', compact ? '' : 'pt-4')}>
        {compact ? (
          <BrandLogo size="sm" showWordmark />
        ) : (
          <div className="flex flex-col items-start gap-5">
            <img
              src="/Canelalogo.webp"
              width="1024"
              height="686"
              alt=""
              aria-hidden="true"
              decoding="async"
              className="h-auto w-[clamp(10rem,16vw,15rem)] object-contain drop-shadow-[0_0_28px_rgba(46,155,230,0.4)]"
            />
            <p className="font-display text-[clamp(1.6rem,2.6vw,2.5rem)] font-bold uppercase leading-none tracking-[0.12em]">
              <span className="text-text-primary">CANELA </span>
              <span className="text-brand-blue">COACH</span>
            </p>
          </div>
        )}
      </div>

      {!compact && (
        <p className="relative z-10 font-sans text-xs tracking-wide text-text-secondary">
          Logic Code Spot · Evaluaciones físicas profesionales
        </p>
      )}
    </aside>
  );
}

export { ChevronDecor, DotCorners };
