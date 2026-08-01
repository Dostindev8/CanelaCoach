import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';

export function OlvidePasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/cliente/auth/olvide-password', { email });
      setDone(true);
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="card-panel mx-auto max-w-md space-y-3 text-center">
        <h1 className="panel-text font-display text-xl tracking-wider">REVISA TU CORREO</h1>
        <p className="panel-muted text-sm">
          Si el correo existe en el sistema, enviamos un enlace para restablecer la contraseña.
        </p>
        <Link to="/portal/login" className="btn-primary inline-flex min-h-touch">
          Volver al login
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="panel-text font-display text-fluid-xl tracking-wider">OLVIDÉ MI CONTRASEÑA</h1>
      <form onSubmit={onSubmit} className="card-panel space-y-3">
        <div>
          <label className="label" htmlFor="olvide-email">
            Email
          </label>
          <input
            id="olvide-email"
            className="input min-h-touch"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <button type="submit" className="btn-primary w-full min-h-touch" disabled={loading}>
          {loading ? 'Enviando…' : 'Enviar enlace'}
        </button>
        <Link to="/portal/login" className="block text-center text-sm text-accent">
          Volver
        </Link>
      </form>
    </div>
  );
}
