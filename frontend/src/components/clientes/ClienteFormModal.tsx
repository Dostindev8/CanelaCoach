import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const schema = z.object({
  nombre: z.string().min(2, 'Mínimo 2 caracteres'),
  edad: z.coerce.number().int().min(1).max(120),
  sexo: z.enum(['Masculino', 'Femenino']),
  email: z.string().email().optional().or(z.literal('')),
  telefono: z.string().max(30).optional().or(z.literal('')),
  objetivo: z.string().max(500).optional().or(z.literal('')),
  ocupacion: z.string().max(120).optional().or(z.literal('')),
  nivelActividad: z.enum(['Sedentario', 'Moderado', 'Activo', 'Muy activo']).optional(),
});

export type ClienteFormData = z.infer<typeof schema>;

export interface ClienteEditable {
  _id: string;
  nombre: string;
  edad: number;
  sexo: 'Masculino' | 'Femenino';
  email?: string;
  telefono?: string;
  objetivo?: string;
  ocupacion?: string;
  nivelActividad?: 'Sedentario' | 'Moderado' | 'Activo' | 'Muy activo';
}

interface Props {
  open: boolean;
  title: string;
  initial?: ClienteEditable | null;
  saving?: boolean;
  onClose: () => void;
  onSubmit: (values: ClienteFormData) => void;
}

export function ClienteFormModal({ open, title, initial, saving, onClose, onSubmit }: Props) {
  const form = useForm<ClienteFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      sexo: 'Masculino',
      nombre: '',
      edad: 25,
      email: '',
      telefono: '',
      objetivo: '',
      ocupacion: '',
      nivelActividad: 'Moderado',
    },
  });

  useEffect(() => {
    if (!open) return;
    if (initial) {
      form.reset({
        nombre: initial.nombre,
        edad: initial.edad,
        sexo: initial.sexo,
        email: initial.email || '',
        telefono: initial.telefono || '',
        objetivo: initial.objetivo || '',
        ocupacion: initial.ocupacion || '',
        nivelActividad: initial.nivelActividad || 'Moderado',
      });
    } else {
      form.reset({
        sexo: 'Masculino',
        nombre: '',
        edad: 25,
        email: '',
        telefono: '',
        objetivo: '',
        ocupacion: '',
        nivelActividad: 'Moderado',
      });
    }
  }, [open, initial, form]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="cliente-form-title"
        className="card-panel flex max-h-[92dvh] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-t-2xl sm:rounded-2xl"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="cliente-form-title" className="panel-text font-display text-xl tracking-wider">
            {title}
          </h2>
          <button type="button" className="min-h-touch min-w-touch rounded-field border border-[var(--cc-panel-border)] px-3" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">Nombre</label>
            <input className="input" {...form.register('nombre')} />
            {form.formState.errors.nombre && (
              <p className="panel-negative mt-1 text-xs">{form.formState.errors.nombre.message}</p>
            )}
          </div>
          <div>
            <label className="label">Edad</label>
            <input className="input" type="number" inputMode="numeric" {...form.register('edad')} />
          </div>
          <div>
            <label className="label">Sexo</label>
            <select className="input" {...form.register('sexo')}>
              <option>Masculino</option>
              <option>Femenino</option>
            </select>
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" {...form.register('email')} />
          </div>
          <div>
            <label className="label">Teléfono</label>
            <input className="input" {...form.register('telefono')} />
          </div>
          <div>
            <label className="label">Ocupación</label>
            <input className="input" {...form.register('ocupacion')} />
          </div>
          <div>
            <label className="label">Nivel de actividad</label>
            <select className="input" {...form.register('nivelActividad')}>
              <option>Sedentario</option>
              <option>Moderado</option>
              <option>Activo</option>
              <option>Muy activo</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="label">Objetivo</label>
            <input className="input" {...form.register('objetivo')} />
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" className="btn-ghost w-full sm:w-auto" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary w-full sm:w-auto" disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  );
}
