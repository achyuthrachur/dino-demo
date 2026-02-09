'use client';

import { useStore } from '../_lib/store';

export function DevInputPanel() {
  const gestureKind = useStore((s) => s.gestureKind);
  const gestureConfidence = useStore((s) => s.gestureConfidence);
  const gestureEnabled = useStore((s) => s.gestureEnabled);
  const voiceEnabled = useStore((s) => s.voiceEnabled);
  const voiceListening = useStore((s) => s.voiceListening);
  const voiceTranscript = useStore((s) => s.voiceTranscript);

  if (!gestureEnabled && !voiceEnabled) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '14rem',
        left: '0.5rem',
        zIndex: 50,
        background: 'rgba(0,0,0,0.75)',
        color: '#7CF7C6',
        fontFamily: 'monospace',
        fontSize: '0.7rem',
        padding: '0.5rem',
        borderRadius: 6,
        lineHeight: 1.5,
        maxWidth: 220,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 4 }}>Input Debug</div>
      {gestureEnabled && (
        <>
          <div>Gesture: {gestureKind}</div>
          <div>Confidence: {gestureConfidence.toFixed(2)}</div>
        </>
      )}
      {voiceEnabled && (
        <>
          <div>Voice: {voiceListening ? 'LISTENING' : 'idle'}</div>
          <div>Transcript: {voiceTranscript || '—'}</div>
        </>
      )}
    </div>
  );
}
