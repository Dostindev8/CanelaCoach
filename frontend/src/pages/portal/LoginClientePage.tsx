import { FormEvent, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';

export function LoginClientePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const verificado = params.get('verificado');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/cliente/auth/login', { email, password });
      navigate('/portal/dashboard');
    } catch (err: unknown) {
      const m =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message || 'No se pudo iniciar sesión';
      setError(m);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="panel-text font-display text-fluid-xl tracking-wider">INICIAR SESIÓN</h1>
      <p className="panel-muted text-sm">Portal del cliente Canela Coach®</p>
      {verificado === 'true' && (
        <p className="rounded-xl bg-emerald-500/15 px-4 py-3 text-sm text-emerald-300" role="status">
          Correo verificado. Ya puedes entrar.
        </p>
      )}
      {verificado === 'false' && (
        <p className="rounded-xl bg-red-500/15 px-4 py-3 text-sm text-red-300" role="alert">
          Enlace de verificación inválido o expirado.
        </p>
      )}
      <form onSubmit={onSubmit} className="card-panel space-y-3" noValidate>
        <div>
          <label className="label" htmlFor="cliente-email">
            Email
          </label>
          <input
            id="cliente-email"
            className="input min-h-touch"
            type="email"
            autoComplete="email"
            required
            aria-invalid={!!error}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="cliente-password">
            Contraseña
          </label>
          <input
            id="cliente-password"
            className="input min-h-touch"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div aria-live="polite">{error && <p className="text-sm text-danger">{error}</p>}</div>
        <button type="submit" className="btn-primary w-full min-h-touch" disabled={loading}>
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
        <div className="flex flex-col gap-2 text-center text-sm">
          <Link to="/portal/olvide-password" className="text-accent">
            Olvidé mi contraseña
          </Link>
          <Link to="/portal/registro" className="panel-muted">
            Crear cuenta con código de invitación
          </Link>
        </div>
      </form>
    </div>
  );
}
