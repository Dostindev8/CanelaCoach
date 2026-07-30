import { ReactNode } from 'react';
import { BrandHeroPanel, ChevronDecor, DotCorners } from './BrandHeroPanel';
import { FeatureBadge } from '../ui/FeatureBadge';
import { cn } from '../../lib/cn';

function IconShield() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 3l8 3v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-3z" />
    </svg>
  );
}
function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l2.5 2.5L16 9.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconEye() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M1 12.5C2.7 8.1 7 5 12 5s9.3 3.1 11 7.5C21.3 16.9 17 20 12 20S2.7 16.9 1 12.5z" />
      <circle cx="12" cy="12.5" r="3" />
    </svg>
  );
}
function IconTarget() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </svg>
  );
}

const features = [
  { icon: <IconShield />, title: 'PROFESIONAL', subtitle: 'Calidad garantizada' },
  { icon: <IconCheck />, title: 'COMPLETO', subtitle: 'Evaluación integral' },
  { icon: <IconEye />, title: 'VISUAL', subtitle: 'Resultados claros' },
  { icon: <IconTarget />, title: 'EFECTIVO', subtitle: 'Mejora continua' },
];

function AuthBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true">
      <img
        src="/backgroundimage.webp"
        alt=""
        className="h-full w-full object-cover object-center"
        decoding="async"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-void/55 via-void/35 to-void/75" />
      <div className="absolute inset-0 bg-dot-grid bg-dot-grid opacity-35" />
      <DotCorners />
    </div>
  );
}

/** Desktop matches login-reference.png; mobile matches centered premium card layout. */
export function AuthLayout({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('relative flex h-dvh flex-col overflow-hidden bg-void text-text-primary', className)}>
      <AuthBackground />
      <ChevronDecor className="pointer-events-none fixed inset-y-0 right-0 z-0 hidden h-full w-[min(38vw,520px)] opacity-55 md:block" />

      {/* Mobile — centered logo + card + feature grid + copyright */}
      <div className="relative z-10 flex min-h-0 flex-1 flex-col md:hidden">
        <div className="flex shrink-0 justify-center px-4 pb-2 pt-5">
          <img
            src="/Canelalogo.webp"
            alt="Canela Coach"
            width="1024"
            height="686"
            decoding="async"
            className="h-[clamp(5.5rem,24vw,7.25rem)] w-auto object-contain drop-shadow-[0_0_28px_rgba(46,155,230,0.45)]"
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2">
          <div className="mx-auto w-full max-w-[420px]">{children}</div>
        </div>

        <div className="shrink-0 px-4 py-4">
          <div className="mx-auto grid max-w-[420px] grid-cols-2 gap-3">
            {features.map((f) => (
              <FeatureBadge key={f.title} icon={f.icon} title={f.title} subtitle={f.subtitle} />
            ))}
          </div>
        </div>

        <footer className="shrink-0 px-4 pb-5 text-center text-xs text-text-secondary">
          © 2026 <span className="font-semibold text-brand-blue">Canela Coach®</span>. Todos los derechos reservados.
        </footer>
      </div>

      {/* Desktop / tablet — unchanged split layout */}
      <div className="relative z-10 mx-auto hidden min-h-0 w-full max-w-[1680px] flex-1 flex-col md:flex lg:flex-row">
        <div className="hidden shrink-0 items-center justify-center border-b border-border-subtle/30 px-4 py-3 md:flex lg:hidden">
          <BrandHeroPanel compact />
        </div>

        <BrandHeroPanel />

        <section className="flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-y-auto px-4 py-5 sm:px-6 lg:overflow-y-visible lg:px-10 lg:py-6">
          <div className="my-auto w-full max-w-[440px] shrink-0">{children}</div>
        </section>
      </div>

      <footer className="relative z-10 hidden shrink-0 border-t border-border-subtle/40 bg-void/80 px-4 py-3 backdrop-blur-md sm:px-8 md:block">
        <div className="mx-auto grid max-w-[1680px] grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
          {features.map((f, i) => (
            <div key={f.title} className={cn(i > 0 && 'md:border-l md:border-border-subtle/50 md:pl-5')}>
              <FeatureBadge icon={f.icon} title={f.title} subtitle={f.subtitle} />
            </div>
          ))}
        </div>
      </footer>
    </div>
  );
}
