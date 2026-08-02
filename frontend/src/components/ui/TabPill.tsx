import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface TabPillProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: ReactNode;
  icon?: ReactNode;
  active?: boolean;
}

/** Filter / context pill — Detalle "Evaluaciones / Planes / Citas" language. */
export function TabPill({ label, icon, active, className, type = 'button', ...rest }: TabPillProps) {
  return (
    <button
      type={type}
      className={cn(
        'panel-step-pill transition duration-micro',
        active && 'is-active',
        className
      )}
      aria-pressed={active}
      {...rest}
    >
      {icon}
      {label}
    </button>
  );
}
