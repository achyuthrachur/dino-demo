'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDirector } from '../_lib/director';
import { useStore } from '../_lib/store';
import { CHAPTERS } from '../_lib/tour';
import { DURATION_MS, EASING, SPRING_BUTTON } from '../_lib/motion';

export function ExhibitHUD() {
  const mode = useStore((s) => s.mode);
  const phase = useDirector((s) => s.phase);
  const activeChapter = useDirector((s) => s.activeChapter);
  const goToChapter = useDirector((s) => s.goToChapter);
  const goHome = useDirector((s) => s.goHome);
  // Only visible in skeleton mode when touring
  const visible = mode === 'skeleton' && activeChapter >= 0;
  const busy = phase === 'busy';

  // Keyboard shortcuts — active when touring
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const { phase, activeChapter, goToChapter, goHome } =
        useDirector.getState();

      if (phase === 'busy') return;
      if (activeChapter < 0) return;

      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          if (activeChapter < CHAPTERS.length - 1) goToChapter(activeChapter + 1);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (activeChapter > 0) goToChapter(activeChapter - 1);
          break;
        case 'Escape':
          e.preventDefault();
          goHome();
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <AnimatePresence mode="wait">
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{
            duration: DURATION_MS.uiSlide / 1000,
            ease: [...EASING.framerCinematic] as [number, number, number, number],
          }}
          style={{
            position: 'fixed',
            top: '1.5rem',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 20,
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}
          className="glass-panel"
        >
          {/* Chapter dots with sliding active pill */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', position: 'relative' }}>
            {CHAPTERS.map((ch, i) => (
              <motion.button
                key={ch.id}
                onClick={() => !busy && goToChapter(i)}
                disabled={busy}
                title={ch.title}
                whileHover={{ scale: 1.3 }}
                whileTap={{ scale: 0.9 }}
                transition={SPRING_BUTTON}
                style={{
                  width: '0.5rem',
                  height: '0.5rem',
                  borderRadius: '4px',
                  border: 'none',
                  background: i === activeChapter
                    ? 'transparent'
                    : 'rgba(255,255,255,0.25)',
                  cursor: busy ? 'wait' : 'pointer',
                  padding: 0,
                  position: 'relative',
                  overflow: 'visible',
                }}
              >
                {i === activeChapter && (
                  <motion.div
                    layoutId="active-chapter-pill"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: '2rem',
                      left: '-0.75rem',
                      background: 'var(--accent)',
                      borderRadius: '4px',
                    }}
                    transition={{
                      type: 'spring',
                      stiffness: 350,
                      damping: 25,
                    }}
                  />
                )}
              </motion.button>
            ))}
          </div>

          {/* Chapter title */}
          <AnimatePresence mode="wait">
            <motion.span
              key={activeChapter}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{
                duration: DURATION_MS.titleEntrance / 1000,
                ease: [...EASING.framerCinematic] as [number, number, number, number],
              }}
              style={{
                fontSize: '0.8rem',
                color: 'var(--fg1)',
                whiteSpace: 'nowrap',
                minWidth: '6rem',
              }}
            >
              {CHAPTERS[activeChapter]?.title ?? ''}
            </motion.span>
          </AnimatePresence>

          {/* Prev / Next */}
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            <motion.button
              onClick={() => !busy && activeChapter > 0 && goToChapter(activeChapter - 1)}
              disabled={busy || activeChapter <= 0}
              whileHover={!(busy || activeChapter <= 0) ? { scale: 1.05 } : undefined}
              whileTap={!(busy || activeChapter <= 0) ? { scale: 0.95 } : undefined}
              transition={SPRING_BUTTON}
              style={navBtnStyle(busy || activeChapter <= 0)}
            >
              &#8592;
            </motion.button>
            <motion.button
              onClick={() =>
                !busy &&
                activeChapter < CHAPTERS.length - 1 &&
                goToChapter(activeChapter + 1)
              }
              disabled={busy || activeChapter >= CHAPTERS.length - 1}
              whileHover={!(busy || activeChapter >= CHAPTERS.length - 1) ? { scale: 1.05 } : undefined}
              whileTap={!(busy || activeChapter >= CHAPTERS.length - 1) ? { scale: 0.95 } : undefined}
              transition={SPRING_BUTTON}
              style={navBtnStyle(busy || activeChapter >= CHAPTERS.length - 1)}
            >
              &#8594;
            </motion.button>
          </div>

          {/* Exit tour */}
          <motion.button
            onClick={() => !busy && goHome()}
            disabled={busy}
            whileHover={!busy ? { scale: 1.05, background: 'rgba(255, 77, 109, 0.3)' } : undefined}
            whileTap={!busy ? { scale: 0.95 } : undefined}
            transition={SPRING_BUTTON}
            style={{
              padding: '0.35rem 0.75rem',
              background: 'rgba(255, 77, 109, 0.2)',
              color: 'var(--danger)',
              border: '1px solid rgba(255, 77, 109, 0.3)',
              borderRadius: '6px',
              cursor: busy ? 'wait' : 'pointer',
              fontWeight: 600,
              fontSize: '0.75rem',
              opacity: busy ? 0.5 : 1,
            }}
          >
            Exit
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function navBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    width: '1.75rem',
    height: '1.75rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(255,255,255,0.08)',
    color: disabled ? 'var(--fg1)' : 'var(--fg0)',
    border: 'none',
    borderRadius: '6px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: '0.85rem',
    opacity: disabled ? 0.4 : 1,
  };
}
