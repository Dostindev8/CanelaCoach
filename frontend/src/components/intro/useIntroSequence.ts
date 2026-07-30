import { useCallback, useEffect, useState } from 'react';
import { INTRO_SESSION_KEY, INTRO_TIMING } from './intro.constants';

function wasShownThisSession(): boolean {
  try {
    return window.sessionStorage.getItem(INTRO_SESSION_KEY) === 'true';
  } catch {
    return false;
  }
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Owns session-only visibility, skip and timer cleanup. It intentionally performs
 * no network work so the intro can never delay authentication or routing.
 */
export function useIntroSequence(onComplete?: () => void) {
  const [visible, setVisible] = useState(() =>
    typeof window !== 'undefined' && !wasShownThisSession()
  );
  const [reducedMotion] = useState(prefersReducedMotion);

  const complete = useCallback(() => {
    try {
      window.sessionStorage.setItem(INTRO_SESSION_KEY, 'true');
    } catch {
      // Storage can be disabled; authentication must still remain accessible.
    }
    setVisible(false);
    onComplete?.();
  }, [onComplete]);

  useEffect(() => {
    if (!visible) return;

    const duration = reducedMotion
      ? INTRO_TIMING.reducedMotionMs
      : INTRO_TIMING.totalMs;
    const timer = window.setTimeout(complete, duration);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') complete();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [complete, reducedMotion, visible]);

  return { complete, reducedMotion, visible };
}
