import { FormEvent, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
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

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') || '';
  const [nuevaPassword, setNueva] = useState('');
  const [confirmarNuevaPassword, setConfirmar] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const nivel = useMemo(() => strength(nuevaPassword), [nuevaPassword]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/cliente/auth/reset-password', {
        token,
        nuevaPassword,
        confirmarNuevaPassword,
      });
      navigate('/portal/login?verificado=true');
    } catch (err: unknown) {
      const m =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message || 'No se pudo restablecer';
      setError(m);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="card-panel mx-auto max-w-md text-center">
        <p className="text-danger">Token inválido. Solicita un nuevo enlace.</p>
        <Link to="/portal/olvide-password" className="btn-primary mt-4 inline-flex min-h-touch">
          Solicitar enlace
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="panel-text font-display text-fluid-xl tracking-wider">NUEVA CONTRASEÑA</h1>
      <form onSubmit={onSubmit} className="card-panel space-y-3">
        <div>
          <label className="label" htmlFor="reset-pass">
            Nueva contraseña
          </label>
          <input
            id="reset-pass"
            className="input min-h-touch"
            type="password"
            required
            value={nuevaPassword}
            onChange={(e) => setNueva(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="reset-confirm">
            Confirmar
          </label>
          <input
            id="reset-confirm"
            className="input min-h-touch"
            type="password"
            required
            value={confirmarNuevaPassword}
            onChange={(e) => setConfirmar(e.target.value)}
          />
        </div>
        {nuevaPassword && (
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
          {loading ? 'Guardando…' : 'Guardar'}
        </button>
      </form>
    </div>
  );
}
