import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const AUTH_BOOTSTRAP_MS = 5_000;

function AuthBootstrapScreen({ timedOut }: { timedOut: boolean }) {
  return (
    <div className="grid min-h-screen place-items-center bg-navy px-6 text-center text-white">
      <div className="max-w-sm space-y-3">
        <div className="animate-pulse font-display text-xl tracking-widest">CANELA COACH®</div>
        <p className="text-sm text-white/70">
          {timedOut ? 'No pudimos validar la sesión. Redirigiendo al login…' : 'Verificando sesión…'}
        </p>
      </div>
    </div>
  );
}

export function PrivateRoute() {
  const { user, loading, mfaSetupRequired } = useAuth();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!loading) {
      setTimedOut(false);
      return;
    }
    const timer = window.setTimeout(() => setTimedOut(true), AUTH_BOOTSTRAP_MS);
    return () => window.clearTimeout(timer);
  }, [loading]);

  if (loading && !timedOut) {
    return <AuthBootstrapScreen timedOut={false} />;
  }

  if (loading && timedOut) {
    return <Navigate to="/login" replace />;
  }

  if (!user) return <Navigate to="/login" replace />;
  if (user.rol === 'paciente') return <Navigate to="/portal" replace />;
  if (mfaSetupRequired) return <Navigate to="/mfa-setup" replace />;
  return <Outlet />;
}
