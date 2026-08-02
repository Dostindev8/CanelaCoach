import type { InputHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  onSearch?: (value: string) => void;
}

export function SearchInput({ className, onSearch, onChange, ...rest }: SearchInputProps) {
  return (
    <div className={cn('relative max-w-md', className)}>
      <span
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 panel-muted text-sm"
        aria-hidden
      >
        ⌕
      </span>
      <input
        type="search"
        className="input pl-9"
        onChange={(e) => {
          onChange?.(e);
          onSearch?.(e.target.value);
        }}
        {...rest}
      />
    </div>
  );
}
