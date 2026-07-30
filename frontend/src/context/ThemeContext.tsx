import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type ThemeMode = 'day' | 'night';

const STORAGE_KEY = 'cc_theme';

interface ThemeContextValue {
  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredTheme(): ThemeMode | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === 'day' || raw === 'night') return raw;
  } catch {
    // Storage blocked — fall back to system preference.
  }
  return null;
}

function systemDefaultTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'day';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'night' : 'day';
}

function applyHtmlTheme(mode: ThemeMode) {
  document.documentElement.classList.toggle('dark', mode === 'night');
}

/** Panel-only theme provider — never wraps Login. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => readStoredTheme() ?? systemDefaultTheme());

  useEffect(() => {
    applyHtmlTheme(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Preference cannot be persisted; runtime theme still applies.
    }
  }, [theme]);

  useEffect(() => {
    return () => {
      document.documentElement.classList.remove('dark');
    };
  }, []);

  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeState(mode);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === 'day' ? 'night' : 'day'));
  }, []);

  const value = useMemo(() => ({ theme, toggleTheme, setTheme }), [theme, toggleTheme, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme debe usarse dentro de ThemeProvider');
  return ctx;
}
