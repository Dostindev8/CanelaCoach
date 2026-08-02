import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface SectionCardProps {
  title: string;
  icon?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Section card — MEMBRESÍA / MÉTRICAS pattern (card-panel + display title). */
export function SectionCard({ title, icon, actions, children, className }: SectionCardProps) {
  return (
    <section className={cn('card-panel space-y-4', className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="panel-text flex items-center gap-2 font-display text-lg tracking-wider">
          {icon}
          <span className="uppercase">{title}</span>
        </h2>
        {actions}
      </div>
      {children}
    </section>
  );
}
