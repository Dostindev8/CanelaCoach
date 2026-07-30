import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/cn';

export interface BrandCheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
}

export const BrandCheckbox = forwardRef<HTMLInputElement, BrandCheckboxProps>(
  function BrandCheckbox({ label, className, id, checked, ...props }, ref) {
    const fieldId = id || `chk-${label.toLowerCase().replace(/\s+/g, '-')}`;

    return (
      <label htmlFor={fieldId} className={cn('inline-flex items-center gap-2.5 cursor-pointer select-none min-h-touch', className)}>
        <span className="relative flex items-center justify-center">
          <input
            ref={ref}
            id={fieldId}
            type="checkbox"
            checked={checked}
            className="peer sr-only"
            {...props}
          />
          <span
            className={cn(
              'flex h-5 w-5 items-center justify-center rounded-[4px] border-2 border-border-glow bg-surface-alt transition-colors duration-micro',
              'peer-focus-visible:ring-2 peer-focus-visible:ring-accent-bright peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-surface',
              'peer-checked:bg-brand-blue peer-checked:border-brand-blue'
            )}
            aria-hidden="true"
          >
            <svg
              viewBox="0 0 16 16"
              className={cn(
                'h-3 w-3 text-void opacity-0 scale-75 transition-all duration-micro',
                checked && 'opacity-100 scale-100 animate-check-in'
              )}
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M3 8.5l3.5 3.5L13 4.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </span>
        <span className="font-sans text-sm font-medium text-text-primary">{label}</span>
      </label>
    );
  }
);
