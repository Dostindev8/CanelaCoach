import { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export function AuthCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'relative w-full rounded-auth',
        'border border-accent-bright/45 bg-[#050B14]/92 backdrop-blur-lg',
        'shadow-[0_0_0_1px_rgba(23,110,164,0.35),0_-24px_48px_-12px_rgba(10,42,77,0.5),0_28px_56px_rgba(0,0,0,0.55),0_0_40px_rgba(12,131,244,0.18)]',
        'animate-auth-enter',
        className
      )}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-40 rounded-t-auth bg-card-top-glow opacity-95"
        aria-hidden="true"
      />
      <div className="relative z-10 overflow-visible px-6 py-7 sm:px-8 sm:py-8">{children}</div>
    </div>
  );
}
