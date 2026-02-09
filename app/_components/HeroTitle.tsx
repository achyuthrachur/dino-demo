'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { EASING } from '../_lib/motion';
import { useStore } from '../_lib/store';

const TITLE = "ACH'S VIRTUAL REX";
const CHAR_STAGGER = 0.04;
const INTRO_DURATION = 0.3 + TITLE.length * CHAR_STAGGER + 0.7; // time for all chars + underline
const HOLD_MS = 1800; // hold at center before moving up

export function HeroTitle() {
  const sceneReady = useStore((s) => s.sceneReady);
  const [phase, setPhase] = useState<'hidden' | 'center' | 'top'>('hidden');
  const started = useRef(false);

  useEffect(() => {
    if (sceneReady && !started.current) {
      started.current = true;
      setPhase('center');

      // After intro animation + hold, move to top
      const moveDelay = INTRO_DURATION * 1000 + HOLD_MS;
      const timer = setTimeout(() => setPhase('top'), moveDelay);
      return () => clearTimeout(timer);
    }
  }, [sceneReady]);

  if (phase === 'hidden') return null;

  return (
    <motion.div
      initial={{ top: '50%', y: '-50%' }}
      animate={
        phase === 'top'
          ? { top: '1.5rem', y: '0%' }
          : { top: '50%', y: '-50%' }
      }
      transition={{
        duration: 1.2,
        ease: [...EASING.framerCinematic] as [number, number, number, number],
      }}
      style={{
        position: 'fixed',
        left: 0,
        width: '100vw',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        zIndex: 12,
        pointerEvents: 'none',
      }}
    >
      {/* Title characters */}
      <div
        style={{
          display: 'flex',
          gap: '0.15em',
          overflow: 'hidden',
        }}
      >
        {TITLE.split('').map((char, i) => (
          <motion.span
            key={i}
            initial={{ y: 60, opacity: 0, rotateX: -90 }}
            animate={
              phase === 'top'
                ? { y: 0, opacity: 1, rotateX: 0, fontSize: 'clamp(1.2rem, 2.5vw, 1.8rem)' }
                : { y: 0, opacity: 1, rotateX: 0, fontSize: 'clamp(2.5rem, 6vw, 5rem)' }
            }
            transition={{
              y: { delay: 0.3 + i * CHAR_STAGGER, duration: 0.7, ease: [...EASING.framerCinematic] as [number, number, number, number] },
              opacity: { delay: 0.3 + i * CHAR_STAGGER, duration: 0.7 },
              rotateX: { delay: 0.3 + i * CHAR_STAGGER, duration: 0.7, ease: [...EASING.framerCinematic] as [number, number, number, number] },
              fontSize: { duration: 1.2, ease: [...EASING.framerCinematic] as [number, number, number, number] },
            }}
            style={{
              display: 'inline-block',
              fontWeight: 800,
              color: 'var(--fg0)',
              letterSpacing: '0.06em',
              textShadow: '0 0 40px rgba(124, 247, 198, 0.3), 0 2px 8px rgba(0, 0, 0, 0.6)',
              minWidth: char === ' ' ? '0.3em' : undefined,
            }}
          >
            {char}
          </motion.span>
        ))}
      </div>

      {/* Accent underline */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{
          delay: 0.3 + TITLE.length * CHAR_STAGGER + 0.2,
          duration: 0.8,
          ease: [...EASING.framerCinematic] as [number, number, number, number],
        }}
        style={{
          width: 'clamp(200px, 40vw, 400px)',
          height: 2,
          background: 'linear-gradient(90deg, transparent, var(--accent), transparent)',
          marginTop: '0.75rem',
          transformOrigin: 'center',
        }}
      />
    </motion.div>
  );
}
