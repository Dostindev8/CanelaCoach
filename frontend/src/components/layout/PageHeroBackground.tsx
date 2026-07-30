import { memo } from 'react';
import { cn } from '../../lib/cn';

interface PageHeroBackgroundProps {
  intensity?: 'default' | 'subtle';
  photoSide?: 'left' | 'right';
}

const positionMap = {
  right: 'object-[88%_center]',
  left: 'object-[22%_center]',
} as const;

/** Premium unified background — full-bleed gym photo without cropping the coach figure. */
export const PageHeroBackground = memo(function PageHeroBackground({
  intensity = 'default',
  photoSide = 'right',
}: PageHeroBackgroundProps) {
  const photoOpacity =
    intensity === 'subtle'
      ? 'opacity-[0.28] sm:opacity-[0.34] md:opacity-[0.38]'
      : 'opacity-[0.38] sm:opacity-[0.46] md:opacity-[0.52]';

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-gradient-to-b from-[#05070C] via-[#0B1220] to-[#05070C]" />

      <img
        src="/backgroundimage.webp"
        alt=""
        loading="lazy"
        decoding="async"
        className={cn(
          'absolute inset-0 h-full w-full max-w-none object-cover',
          positionMap[photoSide],
          photoOpacity
        )}
      />

      <div
        className={cn(
          'absolute inset-0',
          photoSide === 'right'
            ? 'bg-gradient-to-r from-[#05070C]/95 via-[#05070C]/72 to-[#05070C]/20'
            : 'bg-gradient-to-l from-[#05070C]/95 via-[#05070C]/72 to-[#05070C]/20'
        )}
      />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,rgba(47,111,240,0.16),transparent_42%)]" />
      <div className="absolute inset-0 bg-dot-grid bg-dot-grid opacity-[0.1]" />

      <p className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none whitespace-nowrap font-display text-[clamp(2.5rem,12vw,8rem)] font-bold uppercase tracking-[0.2em] text-white/[0.035]">
        CANELA COACH®
      </p>
    </div>
  );
});
