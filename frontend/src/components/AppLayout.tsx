import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { AgenteWidget } from './ui/AgenteWidget';
import { PrimaryButton } from './ui/PrimaryButton';
import { UserAvatar } from './ui/UserAvatar';
import { PageHeroBackground } from './layout/PageHeroBackground';
import { ProfileMenu } from './profile/ProfileMenu';
import { ProfileSettingsModal } from './profile/ProfileSettingsModal';
import { WelcomeOverlay, clearWelcomeSession } from './welcome/WelcomeOverlay';
import { RouteTransition } from './transitions/RouteTransition';

const links = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/clientes', label: 'Clientes' },
  { to: '/planes', label: 'Planes' },
  { to: '/agenda', label: 'Agenda' },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      {links.map((l) => (
        <NavLink
          key={l.to}
          to={l.to}
          end={l.end}
          onClick={onNavigate}
          className="relative min-h-touch rounded-field text-sm font-medium"
        >
          {({ isActive }) => (
            <span
              className={`relative block px-4 py-2 transition-colors duration-micro ${
                isActive ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="cc-nav-active"
                  className="absolute inset-0 rounded-field bg-btn-primary shadow-[0_0_18px_rgba(12,131,244,0.55)]"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <span className="relative z-10">{l.label}</span>
            </span>
          )}
        </NavLink>
      ))}
    </>
  );
}

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const isDashboard = location.pathname === '/';

  const handleLogout = async () => {
    clearWelcomeSession();
    document.documentElement.classList.remove('dark');
    await logout();
    navigate('/login');
  };

  return (
    <div className="panel-shell">
      <PageHeroBackground
        intensity={isDashboard ? 'subtle' : 'default'}
        photoSide={isDashboard ? 'left' : 'right'}
      />

      <WelcomeOverlay trainerName={user?.nombre} />

      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0B0F17]/92 text-text-primary shadow-[0_8px_32px_rgba(0,0,0,0.45)] backdrop-blur-md">
        <div className="mx-auto grid max-w-7xl grid-cols-[1fr_auto] items-center gap-3 px-4 py-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="justify-self-start truncate text-left font-display text-lg font-bold uppercase tracking-[0.12em] sm:text-xl md:text-2xl md:tracking-[0.14em]"
          >
            CANELA COACH<span className="text-brand-blue">®</span>
          </button>

          <nav className="hidden items-center gap-1 justify-self-center md:flex md:gap-2">
            <NavLinks />
          </nav>

          <div className="hidden items-center gap-3 justify-self-end border-l border-white/10 pl-3 md:flex">
            <ProfileMenu
              nombre={user?.nombre}
              rol={user?.rol}
              photoUrl={user?.photoUrl}
              onEditProfile={() => setProfileOpen(true)}
              onLogout={() => void handleLogout()}
            />
            <PrimaryButton
              variant="ghost"
              className="!min-h-touch !border-0 !px-3 !py-2 text-sm text-text-secondary hover:text-text-primary"
              onClick={() => void handleLogout()}
            >
              Salir
            </PrimaryButton>
          </div>

          <button
            type="button"
            className="min-h-touch min-w-touch justify-self-end rounded-field border border-white/15 px-3 text-sm font-semibold md:hidden"
            aria-label="Abrir menú"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(true)}
          >
            Menú
          </button>
        </div>
      </header>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.button
              type="button"
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] md:hidden"
              aria-label="Cerrar menú"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              className="fixed inset-y-0 right-0 z-[60] flex w-[min(88vw,20rem)] flex-col gap-4 border-l border-white/10 bg-[#0B0F17]/96 p-4 text-text-primary shadow-2xl backdrop-blur-md md:hidden"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 360, damping: 32 }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserAvatar nombre={user?.nombre} photoUrl={user?.photoUrl} size="md" />
                  <div>
                    <p className="text-sm font-semibold">{user?.nombre}</p>
                    <p className="text-xs text-text-secondary">{user?.rol}</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="min-h-touch min-w-touch rounded-field border border-white/15 px-3"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Cerrar menú"
                >
                  ✕
                </button>
              </div>

              <nav className="flex flex-col gap-1 border-t border-white/10 pt-3">
                <NavLinks onNavigate={() => setMobileOpen(false)} />
              </nav>

              <button
                type="button"
                className="btn-ghost w-full"
                onClick={() => {
                  setMobileOpen(false);
                  setProfileOpen(true);
                }}
              >
                Editar perfil
              </button>

              <PrimaryButton
                variant="ghost"
                className="mt-auto w-full !border-white/15 text-text-secondary hover:text-text-primary"
                onClick={() => {
                  setMobileOpen(false);
                  void handleLogout();
                }}
              >
                Salir
              </PrimaryButton>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <main className="relative z-10 mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
        <RouteTransition>
          <Outlet />
        </RouteTransition>
      </main>

      <AgenteWidget />
      <ProfileSettingsModal open={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  );
}
