'use client';

import { useCallback } from 'react';
import { useStore } from '../_lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import { DURATION_MS, EASING } from '../_lib/motion';
import { isVoiceSupported } from '../_lib/voice/config';
import { requestMicPermission, releaseMicPermission } from '../_lib/voice/ptt';

const GESTURE_GUIDE = [
  { gesture: 'Pinch + drag', action: 'Rotate', icon: '👌' },
  { gesture: 'Open palm + move', action: 'Pan', icon: '✋' },
  { gesture: 'Two hands apart/together', action: 'Zoom', icon: '🙌' },
] as const;

const VOICE_GUIDE = [
  { command: '"Speak"', action: 'Play roar (skin mode)' },
  { command: '"Outfit"', action: 'Toggle skin/skeleton' },
  { command: '"Let\'s go"', action: 'Start exhibit tour' },
] as const;

function HandIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 11V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v0" />
      <path d="M14 10V4a2 2 0 0 0-2-2 2 2 0 0 0-2 2v2" />
      <path d="M10 10.5V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v8" />
      <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 17" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  );
}

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (val: boolean) => void | Promise<void>;
  disabled?: boolean;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      style={{
        width: 36,
        height: 20,
        borderRadius: 10,
        border: 'none',
        background: checked ? 'var(--accent)' : 'rgba(255,255,255,0.15)',
        position: 'relative',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background 0.15s ease',
        opacity: disabled ? 0.4 : 1,
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 2,
          left: checked ? 18 : 2,
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: checked ? 'var(--bg0)' : 'var(--fg1)',
          transition: 'left 0.15s ease',
        }}
      />
    </button>
  );
}

export function InputPanel() {
  const gestureEnabled = useStore((s) => s.gestureEnabled);
  const setGestureEnabled = useStore((s) => s.setGestureEnabled);
  const voiceEnabled = useStore((s) => s.voiceEnabled);
  const setVoiceEnabled = useStore((s) => s.setVoiceEnabled);

  const handleVoiceToggle = useCallback(async (enabled: boolean) => {
    if (enabled) {
      setVoiceEnabled(true);
      const granted = await requestMicPermission();
      if (!granted) return; // requestMicPermission already disables + toasts
    } else {
      releaseMicPermission();
      setVoiceEnabled(false);
    }
  }, [setVoiceEnabled]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: DURATION_MS.uiSlide / 1000,
        delay: 0.5,
        ease: [...EASING.framerCinematic] as [number, number, number, number],
      }}
      className="glass-panel"
      style={{
        position: 'fixed',
        bottom: '1.5rem',
        left: '1rem',
        zIndex: 16,
        padding: '0.75rem 1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        width: 200,
      }}
    >
      {/* Gesture toggle */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          color: 'var(--fg0)',
          fontSize: '0.8rem',
          fontWeight: 500,
        }}
      >
        <HandIcon />
        <span style={{ flex: 1 }}>Gesture</span>
        <Toggle checked={gestureEnabled} onChange={setGestureEnabled} />
      </div>

      {/* Voice toggle */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          color: isVoiceSupported() ? 'var(--fg0)' : 'var(--fg1)',
          fontSize: '0.8rem',
          fontWeight: 500,
        }}
      >
        <MicIcon />
        <span style={{ flex: 1 }}>Voice</span>
        <Toggle
          checked={voiceEnabled}
          onChange={handleVoiceToggle}
          disabled={!isVoiceSupported()}
        />
      </div>

      {/* Gesture guide */}
      <AnimatePresence>
        {gestureEnabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div
              style={{
                borderTop: '1px solid rgba(124, 247, 198, 0.15)',
                paddingTop: '0.5rem',
                marginTop: '0.25rem',
              }}
            >
              <div style={{ fontSize: '0.65rem', color: 'var(--fg1)', fontWeight: 600, letterSpacing: '0.06em', marginBottom: '0.35rem' }}>
                GESTURES
              </div>
              {GESTURE_GUIDE.map((g) => (
                <div
                  key={g.action}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    fontSize: '0.7rem',
                    color: 'var(--fg0)',
                    marginBottom: '0.2rem',
                    lineHeight: 1.4,
                  }}
                >
                  <span style={{ width: 18, textAlign: 'center', flexShrink: 0 }}>{g.icon}</span>
                  <span style={{ color: 'var(--accent)', fontWeight: 600, minWidth: 42 }}>{g.action}</span>
                  <span style={{ color: 'var(--fg1)' }}>{g.gesture}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Voice guide */}
      <AnimatePresence>
        {voiceEnabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div
              style={{
                borderTop: '1px solid rgba(124, 247, 198, 0.15)',
                paddingTop: '0.5rem',
                marginTop: '0.25rem',
              }}
            >
              <div style={{ fontSize: '0.65rem', color: 'var(--fg1)', fontWeight: 600, letterSpacing: '0.06em', marginBottom: '0.35rem' }}>
                VOICE (hold mic)
              </div>
              {VOICE_GUIDE.map((v) => (
                <div
                  key={v.command}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    fontSize: '0.7rem',
                    color: 'var(--fg0)',
                    marginBottom: '0.2rem',
                    lineHeight: 1.4,
                  }}
                >
                  <span style={{ color: 'var(--accent)', fontWeight: 600, fontStyle: 'italic', minWidth: 58 }}>{v.command}</span>
                  <span style={{ color: 'var(--fg1)' }}>{v.action}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
