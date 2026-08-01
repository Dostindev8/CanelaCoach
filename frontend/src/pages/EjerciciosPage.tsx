import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { ExerciseVideoPlayer } from '../components/ejercicios/ExerciseVideoPlayer';

const GROUPS = ['pecho', 'espalda', 'piernas', 'hombros', 'brazos', 'core', 'cardio', 'full_body'] as const;

export function EjerciciosPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: '',
    muscleGroup: 'pecho' as (typeof GROUPS)[number],
    videoUrl: '',
    videoPublicId: '',
    thumbnailUrl: '',
    instructions: '',
  });
  const [msg, setMsg] = useState('');
  const [previewId, setPreviewId] = useState<string | null>(null);

  const { data: items, isLoading } = useQuery({
    queryKey: ['exercises'],
    queryFn: async () => (await api.get('/exercises')).data.data,
  });

  const { data: preview } = useQuery({
    queryKey: ['exercise', previewId],
    queryFn: async () => (await api.get(`/exercises/${previewId}`)).data.data,
    enabled: !!previewId,
  });

  const createMut = useMutation({
    mutationFn: async () => {
      const sig = (await api.post('/exercises/upload-signature')).data.data;
      const publicId =
        form.videoPublicId ||
        `manual/${Date.now()}-${form.name.toLowerCase().replace(/\s+/g, '-')}`;
      return (
        await api.post('/exercises', {
          ...form,
          videoPublicId: publicId,
          videoUrl: form.videoUrl || `https://res.cloudinary.com/${sig.cloudName}/video/upload/${publicId}`,
          thumbnailUrl: form.thumbnailUrl || undefined,
        })
      ).data;
    },
    onSuccess: () => {
      setMsg('Ejercicio guardado.');
      setForm({
        name: '',
        muscleGroup: 'pecho',
        videoUrl: '',
        videoPublicId: '',
        thumbnailUrl: '',
        instructions: '',
      });
      qc.invalidateQueries({ queryKey: ['exercises'] });
    },
    onError: () => setMsg('Error al guardar ejercicio'),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="panel-text font-display text-fluid-xl tracking-wider">EJERCICIOS / VIDEO</h1>
        <p className="panel-muted text-sm">
          Biblioteca de ejercicios con video explicativo (Cloudinary firmado en portal)
        </p>
      </div>

      {msg && (
        <p className="rounded-xl bg-accent/10 px-4 py-3 text-sm" role="status">
          {msg}
        </p>
      )}

      <section className="card-panel grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Nombre</label>
          <input
            className="input"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </div>
        <div>
          <label className="label">Grupo muscular</label>
          <select
            className="input"
            value={form.muscleGroup}
            onChange={(e) =>
              setForm((f) => ({ ...f, muscleGroup: e.target.value as (typeof GROUPS)[number] }))
            }
          >
            {GROUPS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="label">URL video (Cloudinary o temporal)</label>
          <input
            className="input"
            value={form.videoUrl}
            onChange={(e) => setForm((f) => ({ ...f, videoUrl: e.target.value }))}
            placeholder="https://res.cloudinary.com/…/video/upload/…"
          />
        </div>
        <div>
          <label className="label">Public ID Cloudinary</label>
          <input
            className="input"
            value={form.videoPublicId}
            onChange={(e) => setForm((f) => ({ ...f, videoPublicId: e.target.value }))}
            placeholder="canela-coach/exercises/sentadilla"
          />
        </div>
        <div>
          <label className="label">Thumbnail URL</label>
          <input
            className="input"
            value={form.thumbnailUrl}
            onChange={(e) => setForm((f) => ({ ...f, thumbnailUrl: e.target.value }))}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Instrucciones</label>
          <textarea
            className="input min-h-[80px]"
            value={form.instructions}
            onChange={(e) => setForm((f) => ({ ...f, instructions: e.target.value }))}
          />
        </div>
        <button
          type="button"
          className="btn-primary sm:col-span-2"
          disabled={!form.name || createMut.isPending}
          onClick={() => createMut.mutate()}
        >
          {createMut.isPending ? 'Guardando…' : 'Guardar ejercicio'}
        </button>
      </section>

      {preview && (
        <section className="card-panel space-y-3">
          <h2 className="panel-text font-display tracking-wider">PREVIEW FIRMADO</h2>
          <ExerciseVideoPlayer
            videoUrl={preview.videoUrl}
            thumbnailUrl={preview.thumbnailUrl}
            title={preview.name}
          />
        </section>
      )}

      <section className="card-panel">
        <h2 className="panel-text mb-4 font-display tracking-wider">BIBLIOTECA</h2>
        {isLoading ? (
          <div className="h-24 animate-pulse rounded-xl bg-silver/20" />
        ) : (
          <ul className="space-y-3">
            {(items || []).map(
              (ex: {
                _id: string;
                name: string;
                muscleGroup: string;
                videoUrl: string;
                thumbnailUrl?: string;
              }) => (
                <li
                  key={ex._id}
                  className="flex flex-col gap-2 border-b border-[var(--cc-panel-border)] pb-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="panel-text font-semibold">{ex.name}</p>
                    <p className="panel-muted text-xs capitalize">{ex.muscleGroup}</p>
                  </div>
                  <button type="button" className="btn-ghost text-sm" onClick={() => setPreviewId(ex._id)}>
                    Ver video firmado
                  </button>
                </li>
              )
            )}
            {(items || []).length === 0 && (
              <p className="panel-muted text-sm">Aún no hay ejercicios. Crea el primero arriba.</p>
            )}
          </ul>
        )}
      </section>
    </div>
  );
}
