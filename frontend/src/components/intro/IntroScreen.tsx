import { AnimatePresence, motion } from 'framer-motion';
import { IntroBackground } from './IntroBackground';
import { IntroLogo } from './IntroLogo';
import { IntroProgress } from './IntroProgress';
import { INTRO_EASING, INTRO_TAGLINE, INTRO_TIMING } from './intro.constants';
import { useIntroSequence } from './useIntroSequence';

const screenVariants = {
  hidden: { opacity: 0, scale: 1.01 },
  visible: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.995 },
};

/**
 * Presentation-only auth splash. Login remains mounted below this overlay, avoiding
 * auth/routing changes and any layout jump when the sequence exits.
 */
export function IntroScreen({ onComplete }: { onComplete?: () => void }) {
  const { complete, reducedMotion, visible } = useIntroSequence(onComplete);
  const transitionDuration = reducedMotion ? 0.3 : INTRO_TIMING.exit;

  return (
    <AnimatePresence mode="wait">
      {visible ? (
        <motion.section
          key="canela-intro"
          className="fixed inset-0 z-[100] grid place-items-center overflow-hidden bg-[#05070C] text-text-primary"
          aria-label="Introducción Canela Coach"
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={screenVariants}
          transition={{ duration: transitionDuration, ease: INTRO_EASING }}
        >
          <IntroBackground />

          <motion.button
            type="button"
            onClick={complete}
            className="absolute bottom-5 right-5 z-20 rounded-field border border-border-subtle bg-surface/80 px-3 py-2 text-xs font-semibold tracking-wide text-text-secondary backdrop-blur transition-colors hover:border-brand-blue hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-bright sm:bottom-7 sm:right-7"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: reducedMotion ? 0 : 0.5, duration: 0.2 }}
          >
            Saltar intro
          </motion.button>

          <div className="relative z-10 grid w-[min(88vw,36rem)] justify-items-center text-center">
            <IntroLogo />

            <motion.div
              className="mt-2 overflow-hidden font-display text-[clamp(1.55rem,6vw,3.2rem)] font-bold leading-none tracking-[0.13em]"
              initial={{ clipPath: 'inset(0 100% 0 0)' }}
              animate={{ clipPath: 'inset(0 0% 0 0)' }}
              transition={{
                delay: reducedMotion ? 0 : INTRO_TIMING.background + INTRO_TIMING.logo,
                duration: reducedMotion ? 0.2 : INTRO_TIMING.wordmark,
                ease: INTRO_EASING,
              }}
            >
              CANELA <span className="text-brand-blue">COACH</span>
            </motion.div>

            <motion.svg
              className="mt-4 h-1 w-[clamp(8rem,28vw,11rem)] overflow-visible"
              viewBox="0 0 176 4"
              fill="none"
              aria-hidden="true"
            >
              <motion.path
                d="M2 2H174"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                className="text-accent-bright drop-shadow-[0_0_6px_rgba(12,131,244,0.9)]"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{
                  delay: reducedMotion ? 0 : INTRO_TIMING.background + INTRO_TIMING.logo + INTRO_TIMING.wordmark,
                  duration: reducedMotion ? 0.2 : INTRO_TIMING.line,
                  ease: INTRO_EASING,
                }}
              />
            </motion.svg>

            <motion.p
              className="mt-5 text-xs tracking-[0.08em] text-text-secondary sm:text-sm"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: reducedMotion ? 0 : INTRO_TIMING.progressDelay,
                duration: reducedMotion ? 0.2 : INTRO_TIMING.tagline,
                ease: INTRO_EASING,
              }}
            >
              {INTRO_TAGLINE}
            </motion.p>
            <IntroProgress />
          </div>
        </motion.section>
      ) : null}
    </AnimatePresence>
  );
}
