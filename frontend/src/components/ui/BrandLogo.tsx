import { cn } from '../../lib/cn';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showWordmark?: boolean;
  className?: string;
}

/** Circular emblem + wordmark — SVG crisp on Retina; interlocking silver V + blue A */
export function BrandLogo({ size = 'lg', showWordmark = true, className }: BrandLogoProps) {
  const dims = { sm: 72, md: 120, lg: 180 }[size];

  return (
    <div className={cn('flex flex-col items-start gap-4', className)}>
      <svg
        width={dims}
        height={dims}
        viewBox="0 0 220 220"
        className="object-contain drop-shadow-[0_0_28px_rgba(46,155,230,0.4)]"
        role="img"
        aria-label="Canela Coach"
      >
        <defs>
          <path id="brandArc" d="M 30 118 A 80 80 0 0 1 190 118" fill="none" />
          <linearGradient id="blueA" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0C83F4" />
            <stop offset="100%" stopColor="#2E9BE6" />
          </linearGradient>
        </defs>
        <text
          fill="#9AA5B1"
          fontFamily="Oswald, sans-serif"
          fontSize="14"
          fontWeight="600"
          letterSpacing="5"
        >
          <textPath href="#brandArc" startOffset="50%" textAnchor="middle">
            CANELA COACH
          </textPath>
        </text>
        {/* Mark: silver chevron/V left + blue A right, interlocking */}
        <g transform="translate(110, 128)">
          {/* Silver V / chevron */}
          <path
            d="M-48 36 L-22 -42 L-6 -42 L-32 36 Z"
            fill="#9AA5B1"
          />
          <path
            d="M-22 -42 L4 36 L20 36 L-6 -42 Z"
            fill="#C5CDD6"
          />
          {/* Blue A */}
          <path
            d="M-2 -42 L28 36 L46 36 L16 -42 Z"
            fill="url(#blueA)"
          />
          <path
            d="M16 -42 L46 36 L62 36 L32 -42 Z"
            fill="#0C83F4"
          />
          {/* A crossbar */}
          <rect x="6" y="-4" width="36" height="8" rx="1" fill="#050B14" />
          <rect x="10" y="-1" width="28" height="3" rx="0.5" fill="#2E9BE6" opacity="0.7" />
        </g>
      </svg>
      {showWordmark && (
        <p className="font-display font-bold uppercase tracking-[0.16em] text-3xl xl:text-4xl leading-none">
          <span className="text-text-primary">CANELA</span>{' '}
          <span className="text-brand-blue">COACH</span>
        </p>
      )}
    </div>
  );
}

export function BrandWordmark({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        'font-display font-bold uppercase tracking-[0.12em] text-text-primary text-center',
        className
      )}
    >
      CANELA COACH<span className="text-brand-blue">®</span>
    </p>
  );
}
