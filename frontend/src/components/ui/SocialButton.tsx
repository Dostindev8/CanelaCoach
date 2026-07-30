import { ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

export type SocialProvider = 'google' | 'apple' | 'generic';

const labels: Record<SocialProvider, string> = {
  google: 'Continuar con Google',
  apple: 'Continuar con Apple',
  generic: 'Continuar con perfil',
};

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" aria-hidden="true">
      <path fill="#EA4335" d="M12 10.2v3.6h5.1c-.2 1.2-.9 2.2-1.9 2.9l3.1 2.4c1.8-1.7 2.9-4.1 2.9-7 0-.7-.1-1.3-.2-1.9H12z" />
      <path fill="#34A853" d="M5.3 14.3l-.8.6-2.7 2.1C3.5 20.1 7.4 22.5 12 22.5c2.7 0 5-.9 6.7-2.4l-3.1-2.4c-.9.6-2 .9-3.6.9-2.8 0-5.1-1.9-5.9-4.4z" />
      <path fill="#4A90E2" d="M3.8 7c-.5 1-.8 2.1-.8 3.3s.3 2.3.8 3.3c0 .1 2.7-2.1 2.7-2.1-.2-.5-.3-1-.3-1.6s.1-1.1.3-1.6L3.8 7z" />
      <path fill="#FBBC05" d="M12 4.7c1.5 0 2.8.5 3.9 1.5l2.9-2.9C16.9 1.6 14.7.7 12 .7 7.4.7 3.5 3.1 1.8 6.9l3.5 2.7C6.9 6.6 9.2 4.7 12 4.7z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6 text-text-primary" fill="currentColor" aria-hidden="true">
      <path d="M16.4 12.7c0-2.1 1.7-3.1 1.8-3.2-1-1.4-2.5-1.6-3-1.7-1.3-.1-2.5.8-3.1.8-.6 0-1.6-.7-2.7-.7-1.4 0-2.7.8-3.4 2.1-1.5 2.5-.4 6.3 1 8.3.7 1 1.5 2.1 2.6 2 1-.1 1.4-.7 2.7-.7s1.6.7 2.7.6c1.1-.1 1.8-1 2.5-2 .8-1.1 1.1-2.2 1.1-2.3-.1 0-2.1-.8-2.2-3.2zM14.5 5.8c.6-.7 1-1.7.9-2.7-0.9.1-1.9.6-2.5 1.3-.6.6-1.1 1.6-1 2.6 1 .1 1.9-.5 2.6-1.2z" />
    </svg>
  );
}

function GenericIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6 text-brand-blue" fill="currentColor" aria-hidden="true">
      <path d="M12 12a4.5 4.5 0 1 0-4.5-4.5A4.5 4.5 0 0 0 12 12zm0 2.25c-3 0-9 1.5-9 4.5V21h18v-2.25c0-3-6-4.5-9-4.5z" />
    </svg>
  );
}

const icons = { google: GoogleIcon, apple: AppleIcon, generic: GenericIcon };

export interface SocialButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  provider: SocialProvider;
}

export function SocialButton({ provider, className, ...props }: SocialButtonProps) {
  const Icon = icons[provider];
  return (
    <button
      type="button"
      aria-label={labels[provider]}
      className={cn(
        'inline-flex items-center justify-center min-h-[44px] min-w-[44px] sm:min-h-[52px] sm:min-w-[52px] rounded-social',
        'bg-surface-alt border border-border-subtle text-text-primary',
        'transition-all duration-micro ease-out',
        'hover:border-brand-blue hover:shadow-input-glow',
        'focus-visible:outline-none focus-visible:shadow-input-focus',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
      {...props}
    >
      <Icon />
    </button>
  );
}
