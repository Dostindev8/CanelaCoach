import { cn } from '../../lib/cn';

interface UserAvatarProps {
  nombre?: string;
  photoUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

function initials(nombre?: string): string {
  if (!nombre?.trim()) return 'CC';
  const parts = nombre.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

const sizeMap = {
  sm: 'h-9 w-9 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-16 w-16 text-lg',
} as const;

export function UserAvatar({ nombre, photoUrl, size = 'sm', className }: UserAvatarProps) {
  const base = cn(
    'flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-btn-primary font-bold text-text-primary shadow-[0_0_14px_rgba(12,131,244,0.5)]',
    sizeMap[size],
    className
  );

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={nombre ? `Avatar de ${nombre}` : 'Avatar'}
        loading="lazy"
        decoding="async"
        className={cn(base, 'object-cover')}
      />
    );
  }

  return (
    <span className={base} aria-hidden="true">
      {initials(nombre)}
    </span>
  );
}
