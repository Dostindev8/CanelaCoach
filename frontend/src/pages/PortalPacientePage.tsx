import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, Navigate } from 'react-router-dom';
import { api } from '../lib/api';
import { GraficaEvolucion } from '../components/ui/GraficaEvolucion';
import { useAuth } from '../hooks/useAuth';

export function PortalPacientePage() {
  const { user, logout } = useAuth();
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [loggedIn, setLoggedIn] = useState(user?.rol === 'paciente');

  const { data, isLoading, refetch, isError } = useQuery({
    queryKey: ['portal-me'],
    queryFn: async () => (await api.get('/portal/me')).data.data,
    enabled: loggedIn || user?.rol === 'paciente',
    retry: false,
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      await api.post('/portal/login', loginForm);
      setLoggedIn(true);
      await refetch();
    } catch {
      setLoginError('Credenciales inválidas');
    }
  };

  if (user && user.rol !== 'paciente' && !loggedIn) {
    return <Navigate to="/" replace />;
  }

  if (!loggedIn && user?.rol !== 'paciente') {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4">
        <h1 className="panel-text font-display text-2xl tracking-wider">PORTAL PACIENTE</h1>
        <p className="panel-muted mb-6 text-sm">Accede a tu expediente y reportes</p>
        <form onSubmit={handleLogin} className="card-panel space-y-3">
          <div>
            <label className="label">Email</label>
            <input
              className="input"
              type="email"
              required
              value={loginForm.email}
              onChange={(e) => setLoginForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Contraseña</label>
            <input
              className="input"
              type="password"
              required
              value={loginForm.password}
              onChange={(e) => setLoginForm((f) => ({ ...f, password: e.target.value }))}
            />
          </div>
          {loginError && <p className="text-sm text-danger">{loginError}</p>}
          <button type="submit" className="btn-primary w-full">
            Entrar
          </button>
        </form>
        <Link to="/login" className="panel-muted mt-4 text-center text-sm">
          ¿Eres el coach? Ir al login
        </Link>
      </div>
    );
  }

  if (isLoading) return <div className="h-40 animate-pulse rounded-2xl bg-silver/20" />;
  if (isError || !data) {
    return (
      <div className="card-panel mx-auto max-w-md space-y-3">
        <p className="panel-text">Sesión expirada o sin acceso.</p>
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            setLoggedIn(false);
            void logout();
          }}
        >
          Volver a entrar
        </button>
      </div>
    );
  }

  const serie =
    (data.evaluaciones || [])
      .slice()
      .reverse()
      .map((e: { fecha: string; antropometria?: { peso?: number }; composicionCorporal?: { grasaCorporalPct?: number; masaMuscular?: number } }) => ({
        fecha: e.fecha,
        peso: e.antropometria?.peso,
        grasaCorporalPct: e.composicionCorporal?.grasaCorporalPct,
        masaMuscular: e.composicionCorporal?.masaMuscular,
      })) || [];

  const fotos = (data.evaluaciones || [])
    .flatMap((e: { fotografias?: Record<string, string>; fecha: string }) =>
      Object.entries(e.fotografias || {})
        .filter(([, url]) => !!url)
        .map(([k, url]) => ({ url, label: `${k} · ${new Date(e.fecha).toLocaleDateString('es-DO')}` }))
    );

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="panel-text font-display text-fluid-xl tracking-wider">
            Hola, {data.cliente?.nombre}
          </h1>
          <p className="panel-muted text-sm">{data.cliente?.codigoCliente}</p>
        </div>
        <button
          type="button"
          className="btn-ghost"
          onClick={async () => {
            setLoggedIn(false);
            await logout();
          }}
        >
          Salir
        </button>
      </div>

      <p className="panel-muted text-xs italic">
        Estimación basada en métodos antropométricos estándar — no constituye diagnóstico médico.
      </p>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(data.planes || []).slice(0, 4).map(
          (a: { _id: string; planId?: { tipo?: string; nombre?: string; contenido?: string } }) => (
            <article key={a._id} className="card-panel">
              <p className="panel-muted text-xs uppercase">{a.planId?.tipo || 'plan'}</p>
              <h3 className="panel-text font-semibold">{a.planId?.nombre || 'Asignado'}</h3>
              <p className="panel-muted mt-2 line-clamp-3 text-sm">{a.planId?.contenido}</p>
            </article>
          )
        )}
        {(data.planes || []).length === 0 && (
          <p className="panel-muted col-span-full text-sm">Aún no tienes planes asignados.</p>
        )}
      </section>

      {data.proximaCita && (
        <div className="card-panel">
          <p className="panel-muted text-xs uppercase tracking-wider">Próxima cita</p>
          <p className="panel-text font-semibold">
            {new Date(data.proximaCita.fecha).toLocaleString('es-DO')}
          </p>
          {data.proximaCita.notas && (
            <p className="panel-muted text-sm">{data.proximaCita.notas}</p>
          )}
        </div>
      )}

      <GraficaEvolucion data={serie} suficiente={serie.length >= 2} loading={false} />

      <section className="card-panel">
        <h2 className="panel-text mb-3 font-display text-lg tracking-wider">REPORTES</h2>
        <ul className="space-y-2">
          {(data.reportes || []).map((r: { _id: string; pdfUrl: string; generadoEn: string }) => (
            <li key={r._id}>
              <a
                href={r.pdfUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-accent hover:underline"
              >
                PDF · {new Date(r.generadoEn).toLocaleDateString('es-DO')}
              </a>
            </li>
          ))}
          {(data.evaluaciones || [])
            .filter((e: { reporte?: { pdfUrl?: string } }) => e.reporte?.pdfUrl)
            .map((e: { _id: string; fecha: string; reporte: { pdfUrl: string } }) => (
              <li key={e._id}>
                <a
                  href={e.reporte.pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-accent hover:underline"
                >
                  Evaluación · {new Date(e.fecha).toLocaleDateString('es-DO')}
                </a>
              </li>
            ))}
        </ul>
      </section>

      <section className="card-panel">
        <h2 className="panel-text mb-3 font-display text-lg tracking-wider">GALERÍA</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {fotos.map((f: { url: string; label: string }, i: number) => (
            <figure key={`${f.url}-${i}`} className="overflow-hidden rounded-xl bg-black/20">
              <img src={f.url} alt={f.label} className="h-40 w-full object-contain" />
              <figcaption className="panel-muted p-2 text-xs">{f.label}</figcaption>
            </figure>
          ))}
          {fotos.length === 0 && <p className="panel-muted text-sm">Sin fotos aún.</p>}
        </div>
      </section>

      <section className="card-panel">
        <h2 className="panel-text mb-3 font-display text-lg tracking-wider">AVISOS DEL COACH</h2>
        <ul className="space-y-3">
          {(data.avisos || []).map(
            (a: { fecha: string; notas?: string; objetivos?: string }, i: number) => (
              <li key={i} className="border-b border-[var(--cc-panel-border)] pb-2">
                <p className="panel-muted text-xs">{new Date(a.fecha).toLocaleDateString('es-DO')}</p>
                {a.notas && <p className="panel-text text-sm">{a.notas}</p>}
                {a.objetivos && <p className="panel-muted text-sm">{a.objetivos}</p>}
              </li>
            )
          )}
          {(data.avisos || []).length === 0 && (
            <p className="panel-muted text-sm">Sin avisos recientes.</p>
          )}
        </ul>
      </section>
    </div>
  );
}
