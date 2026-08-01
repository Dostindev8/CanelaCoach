import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';

export function VerificarEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        await api.post('/cliente/auth/verificar-email', { token });
        if (!cancelled) setStatus('ok');
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="card-panel mx-auto max-w-md space-y-4 text-center">
      <h1 className="panel-text font-display text-fluid-xl tracking-wider">VERIFICACIÓN</h1>
      {status === 'loading' && <p className="panel-muted text-sm">Confirmando tu correo…</p>}
      {status === 'ok' && (
        <>
          <p className="text-sm text-emerald-300" role="status">
            Correo verificado. Ya puedes iniciar sesión.
          </p>
          <Link to="/portal/login?verificado=true" className="btn-primary inline-flex min-h-touch">
            Ir al login
          </Link>
        </>
      )}
      {status === 'error' && (
        <>
          <p className="text-sm text-danger" role="alert">
            Enlace inválido o expirado.
          </p>
          <Link to="/portal/login" className="btn-ghost inline-flex min-h-touch">
            Volver
          </Link>
        </>
      )}
    </div>
  );
}
