import { useState, forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

function IconLock() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5" aria-hidden="true">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function IconEye({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5" aria-hidden="true">
        <path d="M3 3l18 18" />
        <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
        <path d="M9.9 5.1A10.5 10.5 0 0 1 12 5c5 0 9.3 3.1 11 7.5a11.5 11.5 0 0 1-4.2 5.1" />
        <path d="M6.1 6.1A11.5 11.5 0 0 0 1 12.5C2.7 16.9 7 20 12 20c1.4 0 2.7-.2 3.9-.7" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5" aria-hidden="true">
      <path d="M1 12.5C2.7 8.1 7 5 12 5s9.3 3.1 11 7.5C21.3 16.9 17 20 12 20S2.7 16.9 1 12.5z" />
      <circle cx="12" cy="12.5" r="3" />
    </svg>
  );
}

export interface PasswordFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  error?: string;
}

export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(
  function PasswordField({ label, error, className, id, ...props }, ref) {
    const [visible, setVisible] = useState(false);
    const fieldId = id || props.name || 'password';

    return (
      <div className="w-full">
        <label htmlFor={fieldId} className="mb-2 block font-sans text-sm font-medium text-text-primary">
          {label}
        </label>
        <div className="relative">
          <span
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-brand-blue"
            aria-hidden="true"
          >
            <IconLock />
          </span>
          <input
            ref={ref}
            id={fieldId}
            type={visible ? 'text' : 'password'}
            className={cn(
              'w-full min-h-touch rounded-field bg-surface-alt font-sans text-text-primary placeholder:text-text-placeholder',
              'border border-border-glow shadow-input-glow pl-11 pr-11 py-2.5',
              'transition-shadow duration-micro ease-out',
              'focus:outline-none focus:shadow-input-focus focus:border-accent-bright',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              error && 'border-danger shadow-none',
              className
            )}
            {...props}
          />
          <button
            type="button"
            className="absolute right-1 top-1/2 -translate-y-1/2 min-h-touch min-w-touch inline-flex items-center justify-center text-text-secondary hover:text-brand-blue transition-colors duration-micro rounded-field"
            aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            aria-pressed={visible}
            onClick={() => setVisible((v) => !v)}
          >
            <IconEye open={visible} />
          </button>
        </div>
        {error && (
          <p className="mt-1.5 text-sm text-danger" role="alert" aria-live="polite">
            {error}
          </p>
        )}
      </div>
    );
  }
);
