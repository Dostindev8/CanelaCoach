import { FormEvent, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';

function strength(password: string): 'debil' | 'media' | 'fuerte' {
  let score = 0;
  if (password.length >= 10) score += 1;
  if (password.length >= 14) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  if (score >= 5) return 'fuerte';
  if (score >= 3) return 'media';
  return 'debil';
}

export function RegistroClientePage() {
  const [params] = useSearchParams();
  const [form, setForm] = useState({
    codigoInvitacion: params.get('codigo') || '',
    nombre: '',
    email: '',
    password: '',
    confirmarPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const nivel = useMemo(() => strength(form.password), [form.password]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/cliente/auth/registro', form);
      setDone(true);
    } catch (err: unknown) {
      const m =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message || 'No se pudo registrar';
      setError(m);
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="card-panel mx-auto max-w-md space-y-3 text-center">
        <h1 className="panel-text font-display text-xl tracking-wider">REVISA TU CORREO</h1>
        <p className="panel-muted text-sm">
          Te enviamos un enlace de verificación. Debes confirmarlo antes de iniciar sesión.
        </p>
        <Link to="/portal/login" className="btn-primary inline-flex min-h-touch">
          Ir al login
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="panel-text font-display text-fluid-xl tracking-wider">REGISTRO</h1>
      <p className="panel-muted text-sm">Necesitas un código de invitación de tu coach</p>
      <form onSubmit={onSubmit} className="card-panel space-y-3">
        {(
          [
            ['codigoInvitacion', 'Código de invitación', 'text'],
            ['nombre', 'Nombre', 'text'],
            ['email', 'Email', 'email'],
            ['password', 'Contraseña', 'password'],
            ['confirmarPassword', 'Confirmar contraseña', 'password'],
          ] as const
        ).map(([key, label, type]) => (
          <div key={key}>
            <label className="label" htmlFor={key}>
              {label}
            </label>
            <input
              id={key}
              className="input min-h-touch"
              type={type}
              required
              value={form[key]}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
            />
          </div>
        ))}
        {form.password && (
          <p className="panel-muted text-xs">
            Fortaleza:{' '}
            <span
              className={
                nivel === 'fuerte' ? 'text-emerald-300' : nivel === 'media' ? 'text-amber-300' : 'text-red-300'
              }
            >
              {nivel}
            </span>
          </p>
        )}
        <div aria-live="polite">{error && <p className="text-sm text-danger">{error}</p>}</div>
        <button type="submit" className="btn-primary w-full min-h-touch" disabled={loading}>
          {loading ? 'Registrando…' : 'Crear cuenta'}
        </button>
        <Link to="/portal/login" className="block text-center text-sm text-accent">
          Ya tengo cuenta
        </Link>
      </form>
    </div>
  );
}
