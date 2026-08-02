import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

const TONE: Record<string, string> = {
  blue: 'text-accent',
  green: 'text-emerald-300',
  amber: 'text-amber-300',
  red: 'text-red-300',
  muted: 'panel-muted',
};

export type StatCardTone = keyof typeof TONE;

interface StatCardProps {
  label: string;
  value: ReactNode;
  unit?: string;
  footer?: ReactNode;
  icon?: ReactNode;
  tone?: StatCardTone;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}

/** KPI card — mirrors Clientes summary cards (card-panel + display number). */
export function StatCard({
  label,
  value,
  unit,
  footer,
  icon,
  tone = 'muted',
  active,
  onClick,
  className,
}: StatCardProps) {
  const classNames = cn(
    'card-panel stat-card !p-3 text-left transition duration-micro',
    active && 'ring-1 ring-accent',
    onClick && 'hover:bg-white/[0.02]',
    className
  );

  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="panel-muted text-xs font-semibold uppercase tracking-wider">{label}</p>
        {icon ? <span className={cn('shrink-0', TONE[tone])}>{icon}</span> : null}
      </div>
      <p className="panel-text mt-1 font-display text-2xl font-bold sm:text-3xl">
        {value}
        {unit ? <span className="panel-muted ml-1 font-sans text-base font-normal">{unit}</span> : null}
      </p>
      {footer ? <div className="panel-muted mt-2 text-sm">{footer}</div> : null}
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={classNames}>
        {body}
      </button>
    );
  }

  return <div className={classNames}>{body}</div>;
}
