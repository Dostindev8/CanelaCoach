import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, Navigate } from 'react-router-dom';
import { api } from '../lib/api';
import { GraficaEvolucion } from '../components/ui/GraficaEvolucion';
import { useAuth } from '../hooks/useAuth';
import { ClientStatusBadge } from '../components/clientes/ClientStatusBadge';
import { ExerciseVideoPlayer } from '../components/ejercicios/ExerciseVideoPlayer';
import { useContentProtection } from '../hooks/useContentProtection';

export function PortalPacientePage() {
  const { user, logout } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [regForm, setRegForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    invitationCode: '',
  });
  const [loginError, setLoginError] = useState('');
  const [loggedIn, setLoggedIn] = useState(user?.rol === 'paciente');

  useContentProtection(loggedIn || user?.rol === 'paciente');

  const { data, isLoading, refetch, isError } = useQuery({
    queryKey: ['portal-me'],
    queryFn: async () => (await api.get('/portal/me')).data.data,
    enabled: loggedIn || user?.rol === 'paciente',
    retry: false,
  });

  const { data: diet } = useQuery({
    queryKey: ['portal-diet'],
    queryFn: async () => (await api.get('/portal/me/diet')).data.data,
    enabled: loggedIn || user?.rol === 'paciente',
  });

  const { data: routine } = useQuery({
    queryKey: ['portal-routine'],
    queryFn: async () => (await api.get('/portal/me/routine')).data.data,
    enabled: loggedIn || user?.rol === 'paciente',
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      await api.post('/portal/register', regForm);
      setMode('login');
      setLoginForm({ email: regForm.email, password: regForm.password });
      setLoginError('Cuenta creada. Inicia sesión.');
    } catch (err: unknown) {
      const m =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message || 'No se pudo registrar';
      setLoginError(m);
    }
  };

  if (user && user.rol !== 'paciente' && !loggedIn) {
    return <Navigate to="/" replace />;
  }

  if (!loggedIn && user?.rol !== 'paciente') {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-8">
        <h1 className="panel-text font-display text-2xl tracking-wider">PORTAL CLIENTE</h1>
        <p className="panel-muted mb-6 text-sm">Evolución, rutina con video y dieta</p>
        {mode === 'login' ? (
          <form onSubmit={handleLogin} className="card-panel space-y-3">
            <div>
              <label className="label">Email</label>
              <input
                className="input"
                type="email"
                autoComplete="email"
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
                autoComplete="current-password"
                required
                value={loginForm.password}
                onChange={(e) => setLoginForm((f) => ({ ...f, password: e.target.value }))}
              />
            </div>
            {loginError && <p className="text-sm text-danger">{loginError}</p>}
            <button type="submit" className="btn-primary w-full min-h-touch">
              Entrar
            </button>
            <button type="button" className="btn-ghost w-full text-sm" onClick={() => setMode('register')}>
              Crear cuenta con código de invitación
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="card-panel space-y-3">
            <div>
              <label className="label">Nombre</label>
              <input
                className="input"
                required
                value={regForm.fullName}
                onChange={(e) => setRegForm((f) => ({ ...f, fullName: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                className="input"
                type="email"
                required
                value={regForm.email}
                onChange={(e) => setRegForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Teléfono (WhatsApp)</label>
              <input
                className="input"
                required
                inputMode="tel"
                value={regForm.phone}
                onChange={(e) => setRegForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Código de invitación</label>
              <input
                className="input uppercase"
                required
                value={regForm.invitationCode}
                onChange={(e) => setRegForm((f) => ({ ...f, invitationCode: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Contraseña</label>
              <input
                className="input"
                type="password"
                minLength={8}
                required
                value={regForm.password}
                onChange={(e) => setRegForm((f) => ({ ...f, password: e.target.value }))}
              />
            </div>
            {loginError && <p className="text-sm text-danger">{loginError}</p>}
            <button type="submit" className="btn-primary w-full min-h-touch">
              Registrarme
            </button>
            <button type="button" className="btn-ghost w-full text-sm" onClick={() => setMode('login')}>
              Ya tengo cuenta
            </button>
          </form>
        )}
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
      .map(
        (e: {
          fecha: string;
          antropometria?: { peso?: number };
          composicionCorporal?: { grasaCorporalPct?: number; masaMuscular?: number };
        }) => ({
          fecha: e.fecha,
          peso: e.antropometria?.peso,
          grasaCorporalPct: e.composicionCorporal?.grasaCorporalPct,
          masaMuscular: e.composicionCorporal?.masaMuscular,
        })
      ) || [];

  return (
    <div className="protected-content mx-auto max-w-6xl space-y-6 px-4 py-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="panel-text font-display text-fluid-xl tracking-wider">
            Hola, {data.cliente?.nombre}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <p className="panel-muted text-sm">{data.cliente?.codigoCliente}</p>
            <ClientStatusBadge status={data.cliente?.membershipStatus} />
          </div>
        </div>
        <button
          type="button"
          className="btn-ghost min-h-touch"
          onClick={async () => {
            setLoggedIn(false);
            await logout();
          }}
        >
          Salir
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="space-y-6 lg:col-span-2">
          <GraficaEvolucion data={serie} suficiente={serie.length >= 2} loading={false} />

          <section className="card-panel space-y-4">
            <h2 className="panel-text font-display text-lg tracking-wider">RUTINA ACTIVA</h2>
            {!routine && <p className="panel-muted text-sm">Tu coach aún no asignó una rutina con video.</p>}
            {(routine?.days || []).map(
              (day: {
                dayLabel: string;
                exercises: Array<{
                  sets: number;
                  reps: string;
                  restSeconds?: number;
                  exercise?: {
                    name?: string;
                    videoUrl?: string;
                    thumbnailUrl?: string;
                    instructions?: string;
                  };
                }>;
              }) => (
                <div key={day.dayLabel} className="space-y-3 border-b border-[var(--cc-panel-border)] pb-4">
                  <h3 className="panel-text font-semibold">{day.dayLabel}</h3>
                  {day.exercises.map((slot, idx) => (
                    <article key={`${day.dayLabel}-${idx}`} className="space-y-2">
                      <p className="panel-text text-sm font-semibold">
                        {slot.exercise?.name || 'Ejercicio'} · {slot.sets}×{slot.reps}
                        {slot.restSeconds ? ` · descanso ${slot.restSeconds}s` : ''}
                      </p>
                      {slot.exercise?.videoUrl && (
                        <ExerciseVideoPlayer
                          videoUrl={slot.exercise.videoUrl}
                          thumbnailUrl={slot.exercise.thumbnailUrl}
                          title={slot.exercise.name || 'Ejercicio'}
                        />
                      )}
                      {slot.exercise?.instructions && (
                        <p className="panel-muted text-xs">{slot.exercise.instructions}</p>
                      )}
                    </article>
                  ))}
                </div>
              )
            )}
          </section>
        </section>

        <aside className="space-y-6">
          <div className="card-panel">
            <p className="panel-muted text-xs uppercase tracking-wider">Membresía</p>
            <div className="mt-2">
              <ClientStatusBadge status={data.cliente?.membershipStatus} />
            </div>
            {data.cliente?.currentPeriodEnd && (
              <p className="panel-muted mt-2 text-sm">
                Periodo hasta {new Date(data.cliente.currentPeriodEnd).toLocaleDateString('es-DO')}
              </p>
            )}
            {data.cliente?.nextEvaluationDate && (
              <p className="panel-muted mt-1 text-sm">
                Próxima eval. {new Date(data.cliente.nextEvaluationDate).toLocaleDateString('es-DO')}
              </p>
            )}
          </div>

          <div className="card-panel">
            <h2 className="panel-text mb-2 font-display tracking-wider">DIETA</h2>
            {diet?.plan ? (
              <>
                <p className="panel-text font-semibold">{diet.plan.nombre}</p>
                <p className="panel-muted mt-2 whitespace-pre-wrap text-sm">{diet.plan.contenido}</p>
              </>
            ) : (
              <p className="panel-muted text-sm">Sin plan de dieta activo.</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
