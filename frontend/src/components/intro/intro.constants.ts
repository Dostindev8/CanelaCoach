export const INTRO_SESSION_KEY = 'cc_intro_shown';

export const INTRO_TIMING = {
  background: 0.5,
  logo: 1.0,
  wordmark: 1.0,
  line: 0.5,
  tagline: 0.5,
  progressDelay: 2.8,
  progressDuration: 1.2,
  exit: 0.4,
  totalMs: 4_200,
  reducedMotionMs: 300,
} as const;

export const INTRO_EASING = [0.16, 1, 0.3, 1] as const;

export const INTRO_TAGLINE = 'Evaluaciones físicas profesionales';
