import { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/cn';

export interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  icon?: ReactNode;
  fullWidth?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
}

function Spinner() {
  return (
    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
    </svg>
  );
}

export function PrimaryButton({
  children,
  loading,
  icon,
  fullWidth,
  variant = 'primary',
  className,
  disabled,
  ...props
}: PrimaryButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 min-h-touch px-5 py-3 rounded-field font-sans font-semibold transition-all duration-micro ease-out disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0';

  const variants = {
    primary:
      'bg-btn-primary text-text-primary shadow-btn-primary hover:-translate-y-px hover:shadow-btn-primary-hover active:translate-y-0',
    secondary:
      'bg-surface-alt text-text-primary border border-border-subtle hover:border-brand-blue',
    ghost:
      'bg-transparent text-text-secondary border border-border-subtle hover:border-brand-blue hover:text-text-primary',
  };

  return (
    <button
      type="button"
      className={cn(base, variants[variant], fullWidth && 'w-full', className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Spinner /> : null}
      <span>{children}</span>
      {!loading && icon ? <span className="inline-flex" aria-hidden="true">{icon}</span> : null}
    </button>
  );
}
