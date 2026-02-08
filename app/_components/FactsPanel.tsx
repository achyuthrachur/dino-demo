'use client';

import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { useDirector } from '../_lib/director';
import { useStore } from '../_lib/store';
import { CHAPTERS } from '../_lib/tour';
import { DURATION_MS, EASING } from '../_lib/motion';

const panelVariants: Variants = {
  hidden: { opacity: 0, x: 30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: DURATION_MS.factEntrance / 1000,
      ease: [...EASING.framerCinematic],
      staggerChildren: DURATION_MS.factStagger / 1000,
      delayChildren: (DURATION_MS.titleEntrance + DURATION_MS.titleUnderline * 0.4) / 1000,
    },
  },
  exit: {
    opacity: 0,
    x: 30,
    transition: {
      duration: DURATION_MS.factExit / 1000,
      ease: [...EASING.framerSnappy],
      staggerChildren: 0.04,
      staggerDirection: -1,
    },
  },
};

const factVariants: Variants = {
  hidden: { opacity: 0, y: 12, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: DURATION_MS.factEntrance / 1000,
      ease: [...EASING.framerStandard],
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: {
      duration: DURATION_MS.factExit / 1000,
      ease: [...EASING.framerSnappy],
    },
  },
};

const bulletVariants: Variants = {
  hidden: { scale: 0, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      duration: DURATION_MS.bulletPop / 1000,
      ease: [...EASING.framerSpring],
    },
  },
  exit: { scale: 0, opacity: 0 },
};

export function FactsPanel() {
  const mode = useStore((s) => s.mode);
  const activeChapter = useDirector((s) => s.activeChapter);
  const phase = useDirector((s) => s.phase);

  const visible = mode === 'skeleton' && activeChapter >= 0 && phase !== 'home';
  const chapter = activeChapter >= 0 ? CHAPTERS[activeChapter] : null;

  return (
    <AnimatePresence mode="wait">
      {visible && chapter && (
        <motion.div
          key={chapter.id}
          variants={panelVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          style={{
            position: 'fixed',
            right: '1.5rem',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 15,
            maxWidth: '20rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            animation: 'accent-glow-in 1.2s ease-out',
          }}
          className="glass-panel"
        >
          {/* Animated chapter title */}
          <motion.h2
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: DURATION_MS.titleEntrance / 1000,
              ease: [...EASING.framerCinematic],
            }}
            style={{
              fontSize: '0.9rem',
              fontWeight: 700,
              color: 'var(--accent)',
              letterSpacing: '0.05em',
              marginBottom: '0.125rem',
            }}
          >
            {chapter.title}
          </motion.h2>

          {/* Accent underline sweep */}
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{
              delay: DURATION_MS.titleEntrance / 1000,
              duration: DURATION_MS.titleUnderline / 1000,
              ease: [...EASING.framerCinematic],
            }}
            style={{
              height: '2px',
              background: 'linear-gradient(to right, var(--accent), transparent)',
              marginBottom: '0.25rem',
            }}
          />

          {/* Staggered fact bullets */}
          {chapter.facts.map((fact, i) => (
            <motion.div
              key={`${chapter.id}-${i}`}
              variants={factVariants}
              style={{
                display: 'flex',
                gap: '0.5rem',
                alignItems: 'flex-start',
              }}
            >
              <motion.span
                variants={bulletVariants}
                style={{
                  color: 'var(--accent)',
                  fontSize: '0.6rem',
                  lineHeight: '1.4rem',
                  flexShrink: 0,
                }}
              >
                &#9670;
              </motion.span>
              <span
                style={{
                  fontSize: '0.8rem',
                  color: 'var(--fg1)',
                  lineHeight: 1.5,
                }}
              >
                {fact}
              </span>
            </motion.div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
