import { useEffect, useRef, useState } from 'react';
import { UserAvatar } from '../ui/UserAvatar';

interface Props {
  nombre?: string;
  rol?: string;
  photoUrl?: string | null;
  onEditProfile: () => void;
  onLogout: () => void;
}

export function ProfileMenu({ nombre, rol, photoUrl, onEditProfile, onLogout }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className="flex min-h-touch items-center gap-2 rounded-field px-1 transition hover:bg-white/5"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
      >
        <UserAvatar nombre={nombre} photoUrl={photoUrl} size="sm" />
        <div className="hidden text-left lg:block">
          <p className="max-w-[12rem] truncate text-sm font-medium">{nombre}</p>
          <p className="text-xs text-text-secondary">{rol}</p>
        </div>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-50 min-w-[12rem] overflow-hidden rounded-field border border-white/10 bg-[#0B0F17]/96 py-1 shadow-2xl backdrop-blur-md"
        >
          <button
            type="button"
            role="menuitem"
            className="block w-full px-4 py-3 text-left text-sm text-text-primary hover:bg-white/5"
            onClick={() => {
              setOpen(false);
              onEditProfile();
            }}
          >
            Ver / editar perfil
          </button>
          <button
            type="button"
            role="menuitem"
            className="block w-full px-4 py-3 text-left text-sm text-text-primary hover:bg-white/5"
            onClick={() => {
              setOpen(false);
              onEditProfile();
            }}
          >
            Cambiar foto
          </button>
          <div className="my-1 border-t border-white/10" />
          <button
            type="button"
            role="menuitem"
            className="block w-full px-4 py-3 text-left text-sm text-text-secondary hover:bg-white/5 hover:text-text-primary"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
          >
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
