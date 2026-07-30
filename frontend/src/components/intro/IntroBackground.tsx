import { motion } from 'framer-motion';
import { INTRO_EASING } from './intro.constants';

const circuitLines = [
  'M -80 88 L 188 356 L -80 624',
  'M -38 52 L 230 356 L -38 660',
  'M 4 16 L 272 356 L 4 696',
  'M 46 -20 L 314 356 L 46 732',
];

export function IntroBackground() {
  return (
    <>
      <div
        className="absolute inset-0 bg-dot-grid bg-dot-grid opacity-70"
        aria-hidden="true"
      />
      <img
        src="/Canelalogo.webp"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 hidden h-[min(68vw,46rem)] w-[min(68vw,46rem)] -translate-x-1/2 -translate-y-1/2 object-contain opacity-[0.035] lg:block"
      />
      <motion.svg
        className="pointer-events-none absolute -right-20 top-1/2 h-[max(36rem,100vh)] w-[min(52vw,42rem)] -translate-y-1/2 opacity-60"
        viewBox="0 0 360 712"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="cc-intro-circuit" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2E9BE6" stopOpacity="0.18" />
            <stop offset="58%" stopColor="#0C83F4" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#01469B" stopOpacity="0.2" />
          </linearGradient>
        </defs>
        {circuitLines.map((d, index) => (
          <motion.path
            key={d}
            d={d}
            fill="none"
            stroke="url(#cc-intro-circuit)"
            strokeWidth={index === 0 ? 2.2 : 1.35}
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{
              duration: 0.8,
              delay: index * 0.07,
              ease: INTRO_EASING,
            }}
          />
        ))}
      </motion.svg>
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_48%,rgba(12,131,244,0.18),transparent_35rem)]"
        aria-hidden="true"
      />
    </>
  );
}
