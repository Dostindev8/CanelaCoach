import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/** Empty copy tone matching Detalle "Sin evaluaciones. Registra la primera…". */
export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('card-panel flex flex-col items-start gap-3 sm:items-center sm:text-center', className)}>
      <p className="panel-text font-semibold">{title}</p>
      {description ? <p className="panel-muted max-w-md text-sm">{description}</p> : null}
      {action}
    </div>
  );
}
