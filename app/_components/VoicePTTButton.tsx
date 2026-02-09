'use client';

import { useCallback } from 'react';
import { useStore } from '../_lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import { EASING, DURATION_MS } from '../_lib/motion';
import { startListening, stopListening } from '../_lib/voice/ptt';

export function VoicePTTButton() {
  const voiceEnabled = useStore((s) => s.voiceEnabled);
  const voiceListening = useStore((s) => s.voiceListening);

  const handlePointerDown = useCallback(() => {
    startListening();
  }, []);

  const handlePointerUp = useCallback(() => {
    stopListening();
  }, []);

  return (
    <AnimatePresence>
      {voiceEnabled && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{
            duration: DURATION_MS.uiSlide / 1000,
            ease: [...EASING.framerCinematic] as [number, number, number, number],
          }}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className="glass-panel"
          title="Hold to speak a command"
          style={{
            position: 'fixed',
            bottom: '6rem',
            right: '2rem',
            zIndex: 21,
            width: 44,
            height: 44,
            borderRadius: 14,
            border: voiceListening
              ? '2px solid var(--accent)'
              : '1px solid rgba(124, 247, 198, 0.3)',
            background: voiceListening
              ? 'rgba(124, 247, 198, 0.2)'
              : 'rgba(10, 14, 28, 0.55)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: voiceListening ? 'var(--accent)' : 'var(--fg1)',
            padding: 0,
            boxShadow: voiceListening
              ? '0 0 12px rgba(124, 247, 198, 0.3)'
              : 'none',
            transition: 'border 0.15s ease, background 0.15s ease, box-shadow 0.15s ease',
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="22" />
          </svg>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
