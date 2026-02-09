'use client';

import { useStore } from '../_lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import { DURATION_MS, EASING } from '../_lib/motion';

const KIND_LABELS: Record<string, { icon: string; label: string }> = {
  rotate: { icon: '🔄', label: 'Rotate' },
  pan: { icon: '✋', label: 'Pan' },
  zoom: { icon: '🔍', label: 'Zoom' },
};

export function GestureStatusPill() {
  const gestureEnabled = useStore((s) => s.gestureEnabled);
  const gestureKind = useStore((s) => s.gestureKind);

  const show = gestureEnabled && gestureKind !== 'none';
  const info = KIND_LABELS[gestureKind];

  return (
    <AnimatePresence>
      {show && info && (
        <motion.div
          key={gestureKind}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{
            duration: DURATION_MS.uiFade / 1000,
            ease: [...EASING.framerCinematic] as [number, number, number, number],
          }}
          className="glass-panel"
          style={{
            position: 'fixed',
            top: '1.5rem',
            right: '1.5rem',
            zIndex: 18,
            padding: '0.4rem 0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.8rem',
            fontWeight: 600,
            color: 'var(--accent)',
            borderRadius: 20,
          }}
        >
          <span>{info.icon}</span>
          <span>{info.label}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
