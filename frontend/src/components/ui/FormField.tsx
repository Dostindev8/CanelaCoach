import { InputHTMLAttributes, ReactNode, forwardRef } from 'react';
import { cn } from '../../lib/cn';

export interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: ReactNode;
  error?: string;
  containerClassName?: string;
}

export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  function FormField({ label, icon, error, className, containerClassName, id, ...props }, ref) {
    const fieldId = id || props.name || label.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className={cn('w-full', containerClassName)}>
        <label htmlFor={fieldId} className="mb-2 block font-sans text-sm font-medium text-text-primary">
          {label}
        </label>
        <div className="relative">
          {icon && (
            <span
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-brand-blue w-5 h-5 flex items-center justify-center"
              aria-hidden="true"
            >
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={fieldId}
            className={cn(
              'w-full min-h-touch rounded-field bg-surface-alt font-sans text-text-primary placeholder:text-text-placeholder',
              'border border-border-glow shadow-input-glow',
              'transition-shadow duration-micro ease-out',
              'focus:outline-none focus:shadow-input-focus focus:border-accent-bright',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              icon ? 'pl-11 pr-3 py-2.5' : 'px-3 py-2.5',
              error && 'border-danger shadow-none',
              className
            )}
            {...props}
          />
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
