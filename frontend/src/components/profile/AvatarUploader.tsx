import { useRef, useState } from 'react';

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];

interface Props {
  currentUrl?: string | null;
  nombre?: string;
  onFileSelect: (file: File) => void;
  error?: string;
}

export function AvatarUploader({ currentUrl, nombre, onFileSelect, error }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [localError, setLocalError] = useState('');

  const displayUrl = preview || currentUrl || null;

  const handleFile = (file: File) => {
    setLocalError('');
    if (!ALLOWED.includes(file.type)) {
      setLocalError('Solo se permiten imágenes JPG, PNG o WebP.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setLocalError('La imagen no puede superar 5 MB.');
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    onFileSelect(file);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        {displayUrl ? (
          <img
            src={displayUrl}
            alt={nombre ? `Foto de ${nombre}` : 'Foto de perfil'}
            className="h-28 w-28 rounded-full object-cover ring-2 ring-[var(--cc-panel-accent)] ring-offset-2 ring-offset-transparent"
          />
        ) : (
          <div className="flex h-28 w-28 items-center justify-center rounded-full bg-btn-primary text-2xl font-bold text-text-primary shadow-[0_0_18px_rgba(12,131,244,0.45)]">
            {nombre?.slice(0, 2).toUpperCase() || 'CC'}
          </div>
        )}
      </div>

      <button type="button" className="btn-primary text-sm" onClick={() => inputRef.current?.click()}>
        Cambiar foto
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
      />

      {(localError || error) && (
        <p className="panel-negative text-center text-sm" role="alert">
          {localError || error}
        </p>
      )}
    </div>
  );
}
