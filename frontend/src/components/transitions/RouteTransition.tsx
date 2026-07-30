import { AnimatePresence, motion } from 'framer-motion';
import { ReactNode, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

const DURATION_MS = 450;

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Brief branded overlay when navigating inside the authenticated panel. */
export function RouteTransition({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [active, setActive] = useState(false);
  const reducedMotion = prefersReducedMotion();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (reducedMotion) return;
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setActive(true);
    const timer = window.setTimeout(() => setActive(false), DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [location.pathname, reducedMotion]);

  return (
    <>
      <AnimatePresence>
        {active && !reducedMotion ? (
          <motion.div
            key={location.pathname}
            className="pointer-events-none fixed inset-0 z-[90] grid place-items-center bg-[#05070C]/88 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            aria-hidden="true"
          >
            <motion.img
              src="/Canelalogo.webp"
              alt=""
              width="1024"
              height="686"
              className="h-auto w-24 object-contain opacity-90 sm:w-28"
              initial={{ opacity: 0.4, scale: 0.92, rotate: -4 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
      <div key={location.pathname} className="panel-route-content">
        {children}
      </div>
    </>
  );
}
