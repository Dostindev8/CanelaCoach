import { motion } from 'framer-motion';
import { INTRO_EASING, INTRO_TIMING } from './intro.constants';

export function IntroProgress() {
  return (
    <motion.div
      className="mt-5 h-px w-[clamp(9rem,35vw,14rem)] overflow-hidden bg-border-subtle"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: INTRO_TIMING.progressDelay, duration: 0.2 }}
      aria-hidden="true"
    >
      <motion.div
        className="h-full origin-left bg-accent-bright shadow-[0_0_10px_rgba(12,131,244,0.9)]"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{
          delay: INTRO_TIMING.progressDelay,
          duration: INTRO_TIMING.progressDuration,
          ease: INTRO_EASING,
        }}
      />
    </motion.div>
  );
}
