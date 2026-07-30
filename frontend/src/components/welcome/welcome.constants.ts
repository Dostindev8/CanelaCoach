export const WELCOME_SESSION_KEY = 'cc_welcome_shown';
export const WELCOME_PENDING_KEY = 'cc_pending_welcome';

export const WELCOME_TIMING = {
  background: 0.4,
  logo: 0.6,
  message: 0.6,
  exit: 0.4,
  totalMs: 2_000,
  reducedMotionMs: 300,
} as const;

export const WELCOME_EASING = [0.16, 1, 0.3, 1] as const;

export const WELCOME_SUBTITLE = 'Tu panel de evaluaciones te está esperando';

export const WELCOME_FALLBACK = '¡Bienvenido, mi negro!';
