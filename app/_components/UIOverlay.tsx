'use client';

import { useStore } from '../_lib/store';
import { motion } from 'framer-motion';
import { DURATION_MS, EASING } from '../_lib/motion';

export function UIOverlay() {
  const mode = useStore((s) => s.mode);
  const sceneReady = useStore((s) => s.sceneReady);
  const requestMode = useStore((s) => s.requestMode);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{
        duration: DURATION_MS.uiFade / 1000,
        ease: EASING.framerStandard,
      }}
      style={{
        position: 'fixed',
        top: '2rem',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10,
        textAlign: 'center',
      }}
      className="glass-panel"
    >
      {/* Title */}
      <h1
        style={{
          fontSize: '1.75rem',
          fontWeight: 700,
          marginBottom: '1rem',
          color: 'var(--accent)',
          letterSpacing: '0.08em',
        }}
      >
        TYRANNOSAURUS REX
      </h1>

      {/* Mode buttons */}
      <div
        style={{
          display: 'flex',
          gap: '0.75rem',
          justifyContent: 'center',
          marginBottom: '1rem',
        }}
      >
        <button
          onClick={() => requestMode('skeleton')}
          disabled={mode === 'skeleton'}
          style={{
            padding: '0.5rem 1.25rem',
            background:
              mode === 'skeleton'
                ? 'var(--accent)'
                : 'rgba(255,255,255,0.08)',
            color: mode === 'skeleton' ? 'var(--bg0)' : 'var(--fg0)',
            border: 'none',
            borderRadius: '8px',
            cursor: mode === 'skeleton' ? 'default' : 'pointer',
            fontWeight: 600,
            fontSize: '0.875rem',
            transition: 'background 0.15s ease, color 0.15s ease',
          }}
        >
          Skeleton
        </button>

        <button
          disabled
          title="Stage 1+"
          style={{
            padding: '0.5rem 1.25rem',
            background: 'rgba(255,255,255,0.04)',
            color: 'var(--fg1)',
            border: '1px dashed rgba(255,255,255,0.15)',
            borderRadius: '8px',
            cursor: 'not-allowed',
            fontWeight: 600,
            fontSize: '0.875rem',
            opacity: 0.5,
          }}
        >
          Skin (Stage 1+)
        </button>
      </div>

      {/* Status indicator */}
      <div style={{ fontSize: '0.8rem', color: 'var(--fg1)' }}>
        Scene: {sceneReady ? '✓ Ready' : '⏳ Loading…'}
      </div>
    </motion.div>
  );
}
