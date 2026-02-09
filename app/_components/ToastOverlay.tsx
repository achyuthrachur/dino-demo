'use client';

import { useEffect, useRef } from 'react';
import { useStore } from '../_lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import { DURATION_MS, EASING } from '../_lib/motion';

export function ToastOverlay() {
  const toastMessage = useStore((s) => s.toastMessage);
  const toastTimestamp = useStore((s) => s.toastTimestamp);
  const clearToast = useStore((s) => s.clearToast);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (toastTimestamp > 0) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        clearToast();
      }, DURATION_MS.inputToast);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [toastTimestamp, clearToast]);

  return (
    <AnimatePresence>
      {toastMessage && (
        <motion.div
          key={toastTimestamp}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{
            duration: DURATION_MS.uiFade / 1000,
            ease: [...EASING.framerCinematic] as [number, number, number, number],
          }}
          className="glass-panel"
          style={{
            position: 'fixed',
            bottom: '5rem',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 11,
            padding: '0.5rem 1rem',
            fontSize: '0.8rem',
            fontWeight: 500,
            color: 'var(--fg0)',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          {toastMessage}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
