import { ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface StatCardProps {
  label: string;
  value: ReactNode;
  unit?: string;
  footer?: ReactNode;
  className?: string;
}

/** Shared KPI / metric card — glass dark premium style. */
export function StatCard({ label, value, unit, footer, className }: StatCardProps) {
  return (
    <div className={cn('card-panel stat-card', className)}>
      <p className="panel-muted text-xs font-semibold uppercase tracking-wider">{label}</p>
      <p className="panel-text mt-2 font-display text-3xl font-bold sm:text-4xl">
        {value}
        {unit ? <span className="panel-muted ml-1 font-sans text-base font-normal">{unit}</span> : null}
      </p>
      {footer ? <div className="panel-muted mt-2 text-sm">{footer}</div> : null}
    </div>
  );
}
