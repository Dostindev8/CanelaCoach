import { useRef, useState } from 'react';
import { api } from '../../lib/api';

interface Props {
  evaluacionId: string;
  tipo: 'frente' | 'perfilDerecho' | 'espalda';
  url?: string;
  onUploaded: (url: string) => void;
}

export function SubidaFoto({ evaluacionId, tipo, url, onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const upload = async (file: File) => {
    setError('');
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('foto', file);
      fd.append('tipo', tipo);
      const { data } = await api.post(`/evaluaciones/${evaluacionId}/foto`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onUploaded(data.data.url);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ||
        'Error al subir';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`panel-dropzone flex min-h-[160px] flex-col items-center justify-center rounded-2xl p-4 text-center transition ${
        dragging ? 'is-dragging' : ''
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const f = e.dataTransfer.files?.[0];
        if (f) void upload(f);
      }}
    >
      {url ? (
        <img src={url} alt={tipo} className="mb-2 max-h-40 w-full rounded-xl object-contain" />
      ) : (
        <p className="panel-muted mb-2 text-sm capitalize">{tipo.replace(/([A-Z])/g, ' $1')}</p>
      )}
      <button
        type="button"
        className="btn-primary text-sm"
        disabled={loading}
        onClick={() => inputRef.current?.click()}
      >
        {loading ? 'Subiendo…' : url ? 'Cambiar foto' : 'Subir foto'}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(f);
        }}
      />
      {error && <p className="panel-negative mt-2 text-xs">{error}</p>}
    </div>
  );
}
