import { useCallback, useEffect, useState } from 'react';

const INTRO_SEEN_KEY = 'canela-coach:intro-seen';
const INTRO_DURATION_MS = 2_000;

function canSkipIntro(): boolean {
  if (typeof window === 'undefined') return true;

  try {
    return (
      window.sessionStorage.getItem(INTRO_SEEN_KEY) === 'true' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  } catch {
    return false;
  }
}

/**
 * One-session auth intro. It is an isolated overlay so LoginPage remains unchanged
 * underneath, and all timers/listeners are cleaned up on navigation/unmount.
 */
export function IntroAnimation() {
  const [completed, setCompleted] = useState(canSkipIntro);

  const finish = useCallback(() => {
    try {
      window.sessionStorage.setItem(INTRO_SEEN_KEY, 'true');
    } catch {
      // A blocked storage API should never prevent access to login.
    }
    setCompleted(true);
  }, []);

  useEffect(() => {
    if (completed) return;

    const timer = window.setTimeout(finish, INTRO_DURATION_MS);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') finish();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [completed, finish]);

  if (completed) return null;

  return (
    <section
      className="intro-screen"
      aria-label="Introducción Canela Coach"
      aria-live="polite"
    >
      <button
        type="button"
        className="intro-skip-surface"
        onClick={finish}
        aria-label="Omitir introducción y mostrar inicio de sesión"
      />

      <div className="intro-content" aria-hidden="true">
        <div className="intro-logo-wrap">
          <img
            src="/Canelalogo.webp"
            width="1024"
            height="686"
            className="intro-logo"
            alt=""
            decoding="async"
          />
        </div>
        <p className="intro-wordmark">CANELA <span>COACH</span></p>
        <svg className="intro-accent-line" viewBox="0 0 172 4" fill="none">
          <path d="M2 2H170" pathLength="1" />
        </svg>
      </div>
    </section>
  );
}
