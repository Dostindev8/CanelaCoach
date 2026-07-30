import { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export interface FeatureBadgeProps {
  icon: ReactNode;
  title: string;
  subtitle: string;
  className?: string;
}

export function FeatureBadge({ icon, title, subtitle, className }: FeatureBadgeProps) {
  return (
    <div className={cn('flex min-w-0 items-start gap-2', className)}>
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-field border border-border-subtle bg-surface-alt text-brand-blue"
        aria-hidden="true"
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="font-display text-xs tracking-[0.08em] uppercase text-text-primary font-bold leading-tight sm:text-sm">
          {title}
        </p>
        <p className="mt-0.5 font-sans text-[11px] leading-snug text-text-secondary sm:text-xs">{subtitle}</p>
      </div>
    </div>
  );
}
