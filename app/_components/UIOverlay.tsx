'use client';

import { useStore } from '../_lib/store';
import { useDirector } from '../_lib/director';
import { motion, AnimatePresence } from 'framer-motion';
import { DURATION_MS, EASING } from '../_lib/motion';

export function UIOverlay() {
  const mode = useStore((s) => s.mode);
  const sceneReady = useStore((s) => s.sceneReady);
  const requestMode = useStore((s) => s.requestMode);
  const transitionPhase = useStore((s) => s.transitionPhase);
  const hasRoarClip = useStore((s) => s.hasRoarClip);
  const triggerRoar = useStore((s) => s.triggerRoar);
  const hasWalkClip = useStore((s) => s.hasWalkClip);
  const triggerWalk = useStore((s) => s.triggerWalk);

  const directorPhase = useDirector((s) => s.phase);
  const activeChapter = useDirector((s) => s.activeChapter);
  const goToChapter = useDirector((s) => s.goToChapter);

  const transitioning = transitionPhase !== 'idle';
  const touring = activeChapter >= 0;

  // Hide Animate button in skeleton mode when touring
  const showAnimate =
    !touring &&
    ((mode === 'skeleton' && hasWalkClip) || (mode === 'skin' && hasRoarClip));

  // Show Explore button only in skeleton mode when not touring
  const showExplore = mode === 'skeleton' && !touring && directorPhase === 'home';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{
        duration: DURATION_MS.uiFade / 1000,
        ease: [...EASING.framerStandard] as [number, number, number, number],
      }}
      style={{
        position: 'fixed',
        bottom: '1.5rem',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        gap: '1.5rem',
      }}
      className="glass-panel"
    >
      {/* Title */}
      <h1
        style={{
          fontSize: '1rem',
          fontWeight: 700,
          color: 'var(--accent)',
          letterSpacing: '0.08em',
          whiteSpace: 'nowrap',
        }}
      >
        TYRANNOSAURUS REX
      </h1>

      {/* Mode buttons */}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button
          onClick={() => requestMode('skeleton')}
          disabled={transitioning || touring}
          style={{
            padding: '0.5rem 1.25rem',
            background:
              mode === 'skeleton'
                ? 'var(--accent)'
                : 'rgba(255,255,255,0.08)',
            color: mode === 'skeleton' ? 'var(--bg0)' : 'var(--fg0)',
            border: 'none',
            borderRadius: '8px',
            cursor: transitioning || touring ? 'wait' : mode === 'skeleton' ? 'default' : 'pointer',
            fontWeight: 600,
            fontSize: '0.875rem',
            transition: 'background 0.15s ease, color 0.15s ease',
            opacity: transitioning || touring ? 0.6 : 1,
          }}
        >
          Skeleton
        </button>

        <button
          onClick={() => requestMode('skin')}
          disabled={transitioning || touring}
          style={{
            padding: '0.5rem 1.25rem',
            background:
              mode === 'skin'
                ? 'var(--accent)'
                : 'rgba(255,255,255,0.08)',
            color: mode === 'skin' ? 'var(--bg0)' : 'var(--fg0)',
            border: 'none',
            borderRadius: '8px',
            cursor: transitioning || touring ? 'wait' : mode === 'skin' ? 'default' : 'pointer',
            fontWeight: 600,
            fontSize: '0.875rem',
            transition: 'background 0.15s ease, color 0.15s ease',
            opacity: transitioning || touring ? 0.6 : 1,
          }}
        >
          Skin
        </button>
      </div>

      {/* Animate button — walk for skeleton, roar for skin */}
      <AnimatePresence>
        {showAnimate && (
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{
              duration: DURATION_MS.uiSlide / 1000,
              ease: [...EASING.framerCinematic] as [number, number, number, number],
            }}
          >
            <button
              onClick={mode === 'skeleton' ? triggerWalk : triggerRoar}
              disabled={transitioning}
              title={mode === 'skeleton' ? 'Play walk animation' : 'Play roar animation'}
              style={{
                padding: '0.5rem 1.25rem',
                background: 'rgba(124, 247, 198, 0.2)',
                color: 'var(--accent)',
                border: '1px solid rgba(124, 247, 198, 0.4)',
                borderRadius: '8px',
                cursor: transitioning ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                fontSize: '0.875rem',
                opacity: transitioning ? 0.5 : 1,
                transition: 'background 0.15s ease, color 0.15s ease',
              }}
            >
              Animate
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Explore button — enters tour */}
      <AnimatePresence>
        {showExplore && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{
              duration: DURATION_MS.uiSlide / 1000,
              ease: [...EASING.framerCinematic] as [number, number, number, number],
            }}
          >
            <button
              onClick={() => goToChapter(0)}
              disabled={transitioning}
              title="Explore the skeleton in an interactive tour"
              style={{
                padding: '0.5rem 1.25rem',
                background: 'rgba(124, 247, 198, 0.12)',
                color: 'var(--accent)',
                border: '1px solid rgba(124, 247, 198, 0.3)',
                borderRadius: '8px',
                cursor: transitioning ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                fontSize: '0.875rem',
                opacity: transitioning ? 0.5 : 1,
                transition: 'background 0.15s ease, color 0.15s ease',
              }}
            >
              Explore
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Animated mode badge */}
      <div style={{ fontSize: '0.8rem', color: 'var(--fg1)', whiteSpace: 'nowrap' }}>
        <AnimatePresence mode="wait">
          <motion.span
            key={mode}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{
              duration: DURATION_MS.uiSlide / 1000,
              ease: [...EASING.framerCinematic] as [number, number, number, number],
            }}
            style={{ display: 'inline-block' }}
          >
            {sceneReady ? `Mode: ${mode.charAt(0).toUpperCase() + mode.slice(1)}` : 'Loading\u2026'}
          </motion.span>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
