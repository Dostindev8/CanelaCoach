import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { WELCOME_PENDING_KEY } from '../components/welcome/welcome.constants';
import { api } from '../lib/api';

export interface User {
  id: string;
  email: string;
  rol: 'admin' | 'entrenador' | 'paciente';
  nombre: string;
  mfaHabilitado?: boolean;
  photoUrl?: string | null;
  clienteId?: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  mfaSetupRequired: boolean;
  login: (email: string, password: string, totpCode?: string) => Promise<{ mfaRequired?: boolean; mfaSetupRequired?: boolean }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setMfaSetupRequired: (v: boolean) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [mfaSetupRequired, setMfaSetupRequired] = useState(false);

  const refreshProfile = async () => {
    try {
      const { data } = await api.get('/auth/perfil', { timeout: 8_000 });
      const u = data.data;
      setUser({
        id: u._id || u.id,
        email: u.email,
        rol: u.rol,
        nombre: u.nombre,
        mfaHabilitado: u.mfaHabilitado,
        photoUrl: u.photoUrl ?? null,
      });
      // Keep admin MFA onboarding state after refresh/reload
      if (u.mfaObligatorio && !u.mfaHabilitado) {
        setMfaSetupRequired(true);
      } else {
        setMfaSetupRequired(false);
      }
    } catch {
      // API down / no session — stay logged out without crashing UI
      setUser(null);
      setMfaSetupRequired(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const boot = async () => {
      try {
        await refreshProfile();
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void boot();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (email: string, password: string, totpCode?: string) => {
    const { data } = await api.post(
      '/auth/login',
      { email, password, totpCode },
      { timeout: 20_000 }
    );
    if (data.data.mfaSetupRequired) {
      setMfaSetupRequired(true);
      if (data.data.user) setUser({ ...data.data.user, id: data.data.user.id });
      return { mfaRequired: true, mfaSetupRequired: true };
    }
    if (data.data.mfaRequired && !data.data.user) {
      return { mfaRequired: true, mfaSetupRequired: false };
    }
    setUser({
      ...data.data.user,
      id: data.data.user.id,
      photoUrl: data.data.user.photoUrl ?? null,
    });
    setMfaSetupRequired(false);
    try {
      sessionStorage.setItem(WELCOME_PENDING_KEY, 'true');
    } catch {
      // Welcome flag is optional UX metadata.
    }
    return {};
  };

  const logout = async () => {
    await api.post('/auth/logout');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, mfaSetupRequired, login, logout, refreshProfile, setMfaSetupRequired }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth fuera de AuthProvider');
  return ctx;
}
