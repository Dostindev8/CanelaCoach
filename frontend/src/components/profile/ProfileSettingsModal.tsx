import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { api } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { AvatarUploader } from './AvatarUploader';
import { UserAvatar } from '../ui/UserAvatar';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ProfileSettingsModal({ open, onClose }: Props) {
  const { user, refreshProfile } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const save = async () => {
    if (!file) {
      onClose();
      return;
    }
    setSaving(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      await api.patch('/users/me/avatar', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await refreshProfile();
      setFile(null);
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ||
        'No se pudo guardar la foto.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-settings-title"
          className="card-panel flex max-h-[92dvh] w-full max-w-md flex-col gap-5 overflow-y-auto rounded-t-2xl sm:rounded-2xl"
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 24, opacity: 0 }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="profile-settings-title" className="panel-text font-display text-xl tracking-wider">
                PERFIL
              </h2>
              <p className="panel-muted mt-1 text-sm">{user?.nombre}</p>
            </div>
            <button
              type="button"
              className="min-h-touch min-w-touch rounded-field border border-[var(--cc-panel-border)] px-3"
              onClick={onClose}
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>

          <div className="flex items-center gap-3">
            <UserAvatar nombre={user?.nombre} photoUrl={user?.photoUrl} size="lg" />
            <div>
              <p className="panel-text text-sm font-semibold">{user?.email}</p>
              <p className="panel-muted text-xs capitalize">{user?.rol}</p>
            </div>
          </div>

          <AvatarUploader
            currentUrl={user?.photoUrl}
            nombre={user?.nombre}
            onFileSelect={setFile}
            error={error}
          />

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" className="btn-ghost w-full sm:w-auto" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button type="button" className="btn-primary w-full sm:w-auto" onClick={() => void save()} disabled={saving}>
              {saving ? 'Guardando…' : file ? 'Guardar foto' : 'Cerrar'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
