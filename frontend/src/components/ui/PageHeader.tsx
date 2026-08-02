import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

/** Page title pattern from CLIENTES: display uppercase + muted subtitle + right actions. */
export function PageHeader({ title, subtitle, icon, actions, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col justify-between gap-3 sm:flex-row sm:items-center',
        className
      )}
    >
      <div className="min-w-0">
        <h1 className="panel-text flex items-center gap-2 font-display text-fluid-xl tracking-wider">
          {icon}
          <span className="uppercase">{title}</span>
        </h1>
        {subtitle ? <p className="panel-muted mt-1 text-sm">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
