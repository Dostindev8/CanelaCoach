import { motion } from 'framer-motion';
import { INTRO_EASING, INTRO_TIMING } from './intro.constants';

export function IntroLogo() {
  return (
    <motion.div
      className="relative grid place-items-center"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: INTRO_TIMING.logo, delay: INTRO_TIMING.background, ease: INTRO_EASING }}
    >
      <motion.div
        className="absolute h-[72%] w-[72%] rounded-full bg-accent-bright/20 blur-3xl"
        animate={{ opacity: [0.2, 0.8, 0.35], scale: [0.9, 1.08, 1] }}
        transition={{ duration: 2, delay: INTRO_TIMING.background + 0.25, ease: 'easeOut' }}
        aria-hidden="true"
      />
      <img
        src="/Canelalogo.webp"
        width="1024"
        height="686"
        alt="Canela Coach"
        decoding="async"
        className="relative h-auto w-[clamp(10rem,33vw,18rem)] object-contain drop-shadow-[0_0_28px_rgba(46,155,230,0.45)]"
      />
    </motion.div>
  );
}
