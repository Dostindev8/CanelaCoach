import { motion } from 'framer-motion';
import { useTheme } from '../../hooks/useTheme';

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <path d="M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12zm0 2a1 1 0 0 1 0 2 8 8 0 0 1 0-16 1 1 0 0 1 0 2 6 6 0 0 0 0 12 1 1 0 0 1 0 2zM1 12a1 1 0 0 1 2 0 4 4 0 0 0 4 4 1 1 0 1 1 0 2 6 6 0 0 1-6-6 1 1 0 0 1 0-2zm22 0a1 1 0 0 1 2 0 6 6 0 0 1-6 6 1 1 0 1 1 0-2 4 4 0 0 0 4-4 1 1 0 0 1 0-2zM4.22 4.22a1 1 0 0 1 1.42 0l1.06 1.06a1 1 0 1 1-1.42 1.42L4.22 5.64a1 1 0 0 1 0-1.42zm15.16 0a1 1 0 0 1 1.42 1.42l-1.06 1.06a1 1 0 1 1-1.42-1.42l1.06-1.06zM6.34 17.66a1 1 0 0 1 1.42 0l1.06 1.06a1 1 0 0 1-1.42 1.42l-1.06-1.06a1 1 0 0 1 0-1.42zm11.32 0a1 1 0 0 1 1.42 1.42l-1.06 1.06a1 1 0 1 1-1.42-1.42l1.06-1.06a1 1 0 0 1 0-1.42z" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <path d="M10.2 2.1a1 1 0 0 1 1.1.17 9 9 0 1 0 10.53 10.53 1 1 0 0 1 .7-1.7 7 7 0 1 1-9.9-9.9 1 1 0 0 1-.43-1.1z" />
    </svg>
  );
}

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isNight = theme === 'night';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isNight}
      aria-label={isNight ? 'Cambiar a modo día' : 'Cambiar a modo noche'}
      onClick={toggleTheme}
      className="relative inline-flex h-9 w-[4.25rem] min-h-touch min-w-[4.25rem] shrink-0 items-center rounded-full border border-white/15 bg-white/5 p-1 transition-colors duration-300 hover:border-brand-blue/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-bright"
    >
      <motion.span
        className="absolute flex h-7 w-7 items-center justify-center rounded-full bg-btn-primary text-text-primary shadow-btn-primary"
        animate={{ x: isNight ? 34 : 0 }}
        transition={{ type: 'spring', stiffness: 420, damping: 28 }}
      >
        <motion.span
          key={theme}
          initial={{ opacity: 0, rotate: -40 }}
          animate={{ opacity: 1, rotate: 0 }}
          transition={{ duration: 0.25 }}
        >
          {isNight ? <MoonIcon /> : <SunIcon />}
        </motion.span>
      </motion.span>
      <span className="flex w-full justify-between px-2 text-[10px] text-text-secondary" aria-hidden="true">
        <SunIcon />
        <MoonIcon />
      </span>
    </button>
  );
}
