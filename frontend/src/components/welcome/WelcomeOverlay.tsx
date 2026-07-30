import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { ChevronDecor } from '../auth/BrandHeroPanel';
import {
  WELCOME_EASING,
  WELCOME_FALLBACK,
  WELCOME_PENDING_KEY,
  WELCOME_SESSION_KEY,
  WELCOME_SUBTITLE,
  WELCOME_TIMING,
} from './welcome.constants';

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function shouldShowWelcome(): boolean {
  try {
    return (
      sessionStorage.getItem(WELCOME_PENDING_KEY) === 'true' &&
      sessionStorage.getItem(WELCOME_SESSION_KEY) !== 'true'
    );
  } catch {
    return false;
  }
}

export function markWelcomeShown(): void {
  try {
    sessionStorage.setItem(WELCOME_SESSION_KEY, 'true');
    sessionStorage.removeItem(WELCOME_PENDING_KEY);
  } catch {
    // Non-blocking if storage is unavailable.
  }
}

export function clearWelcomeSession(): void {
  try {
    sessionStorage.removeItem(WELCOME_SESSION_KEY);
    sessionStorage.removeItem(WELCOME_PENDING_KEY);
  } catch {
    // Ignore on logout cleanup.
  }
}

interface WelcomeOverlayProps {
  trainerName?: string;
}

/** Post-login welcome — premium dark brand aesthetic. */
export function WelcomeOverlay({ trainerName }: WelcomeOverlayProps) {
  const [visible, setVisible] = useState(shouldShowWelcome);
  const [reducedMotion] = useState(prefersReducedMotion);

  const greeting = trainerName?.trim()
    ? `¡Bienvenido, ${trainerName}!`
    : WELCOME_FALLBACK;

  useEffect(() => {
    if (!visible) return;

    const duration = reducedMotion ? WELCOME_TIMING.reducedMotionMs : WELCOME_TIMING.totalMs;
    const timer = window.setTimeout(() => {
      markWelcomeShown();
      setVisible(false);
    }, duration);

    return () => window.clearTimeout(timer);
  }, [reducedMotion, visible]);

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.section
        key="welcome-overlay"
        className="fixed inset-0 z-[120] grid place-items-center overflow-hidden bg-[#05070C]/95 text-text-primary"
        aria-label="Bienvenida Canela Coach"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reducedMotion ? 0.3 : WELCOME_TIMING.exit, ease: WELCOME_EASING }}
      >
        <div
          className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-30"
          style={{ backgroundImage: "url('/backgroundimage.webp')" }}
          aria-hidden="true"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-void/80 via-void/70 to-void/90" aria-hidden="true" />
        <div className="pointer-events-none absolute inset-0 bg-dot-grid bg-dot-grid opacity-40" aria-hidden="true" />
        <ChevronDecor className="pointer-events-none absolute inset-y-0 right-0 h-full w-[min(40vw,480px)] opacity-40" />

        <div className="relative z-10 grid w-[min(90vw,34rem)] justify-items-center text-center">
          <motion.img
            src="/Canelalogo.webp"
            width="1024"
            height="686"
            alt="Canela Coach"
            decoding="async"
            className="h-auto w-[clamp(9rem,28vw,14rem)] object-contain drop-shadow-[0_0_28px_rgba(46,155,230,0.45)]"
            initial={{ opacity: 0, scale: 0.82 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              delay: reducedMotion ? 0 : WELCOME_TIMING.background,
              duration: reducedMotion ? 0.2 : WELCOME_TIMING.logo,
              ease: WELCOME_EASING,
            }}
          />

          <motion.h1
            className="mt-6 font-display text-[clamp(1.5rem,5vw,2.5rem)] font-bold leading-tight tracking-[0.06em]"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: reducedMotion ? 0 : WELCOME_TIMING.background + WELCOME_TIMING.logo,
              duration: reducedMotion ? 0.2 : WELCOME_TIMING.message,
              ease: WELCOME_EASING,
            }}
            aria-live="polite"
          >
            {greeting}
          </motion.h1>

          <motion.p
            className="mt-3 font-sans text-sm text-text-secondary sm:text-base"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{
              delay: reducedMotion ? 0 : WELCOME_TIMING.background + WELCOME_TIMING.logo + 0.15,
              duration: 0.35,
            }}
          >
            {WELCOME_SUBTITLE}
          </motion.p>
        </div>
      </motion.section>
    </AnimatePresence>
  );
}
