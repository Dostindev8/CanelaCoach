import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

type ClienteUser = { id: string; nombre: string; email: string } | null;

export function PortalClienteLayout() {
  const navigate = useNavigate();
  const [user, setUser] = useState<ClienteUser>(null);

  useEffect(() => {
    api
      .get('/cliente/auth/yo')
      .then((r) => setUser({ id: r.data.data._id, nombre: r.data.data.nombre, email: r.data.data.email }))
      .catch(() => setUser(null));
  }, []);

  const logout = async () => {
    await api.post('/cliente/auth/logout');
    setUser(null);
    navigate('/portal/login');
  };

  return (
    <div className="panel-shell min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0B0F17]/92 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link to={user ? '/portal/dashboard' : '/portal/login'} className="panel-text font-display tracking-wider">
            CANELA COACH® · PORTAL
          </Link>
          {user ? (
            <div className="flex items-center gap-3">
              <span className="panel-muted hidden text-sm sm:inline">{user.nombre}</span>
              <button type="button" className="btn-ghost min-h-touch text-sm" onClick={() => void logout()}>
                Cerrar sesión
              </button>
            </div>
          ) : (
            <Link to="/login" className="panel-muted text-sm">
              ¿Eres coach?
            </Link>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet context={{ user, setUser }} />
      </main>
    </div>
  );
}
