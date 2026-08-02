import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive';

const VARIANT: Record<Variant, string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  destructive: 'btn-ghost text-danger border-danger/40 hover:bg-danger/10',
};

interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  icon?: ReactNode;
  label?: ReactNode;
}

/** Action CTA matching Clientes / Detalle headers (primary glow, ghost, destructive). */
export function ActionButton({
  variant = 'primary',
  icon,
  label,
  children,
  className,
  type = 'button',
  ...rest
}: ActionButtonProps) {
  return (
    <button type={type} className={cn(VARIANT[variant], className)} {...rest}>
      {icon}
      {label ?? children}
    </button>
  );
}
