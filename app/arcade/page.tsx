'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArcadeScene } from '@/app/_components/ArcadeScene';
import { ARCADE_CONFIG, type JoyVector } from '@/app/_lib/arcade/config';
import { isControllerAction, isControllerState, type WireMessage } from '@/app/_lib/arcade/protocol';
import {
  createClientId,
  createSessionCode,
  resolveBridgeUrl,
  sanitizeSessionCode,
} from '@/app/_lib/arcade/session';
import { useSessionSocket } from '@/app/_lib/arcade/useSessionSocket';
import { useStore } from '@/app/_lib/store';

function statusColor(status: 'disconnected' | 'connecting' | 'connected'): string {
  if (status === 'connected') return '#7CF7C6';
  if (status === 'connecting') return '#F7D154';
  return '#FF7B7B';
}

export default function ArcadePage() {
  const [session, setSession] = useState('');
  const [bridgeUrl, setBridgeUrl] = useState('');
  const [controllerUrl, setControllerUrl] = useState('');
  const [statusNote, setStatusNote] = useState('Waiting for bridge...');
  const [activeControllerId, setActiveControllerId] = useState<string | null>(null);
  const [lastInputAt, setLastInputAt] = useState<number | null>(null);
  const [resetToken, setResetToken] = useState(0);
  const [timeTick, setTimeTick] = useState(0);
  const [lanWarning, setLanWarning] = useState<string | null>(null);

  const joyRef = useRef<JoyVector>({ x: 0, y: 0 });
  const clientIdRef = useRef(createClientId('mac'));

  const mode = useStore((s) => s.mode);
  const walkLoopEnabled = useStore((s) => s.walkLoopEnabled);
  const audioUnlocked = useStore((s) => s.audioUnlocked);
  const triggerRoar = useStore((s) => s.triggerRoar);
  const requestMode = useStore((s) => s.requestMode);
  const toggleWalkLoop = useStore((s) => s.toggleWalkLoop);
  const setWalkLoopEnabled = useStore((s) => s.setWalkLoopEnabled);
  const requestAudioUnlock = useStore((s) => s.requestAudioUnlock);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialSession = sanitizeSessionCode(params.get('session')) || createSessionCode();
    const bridgeOverride = params.get('bridge');

    const url = new URL('/controller', window.location.origin);
    url.searchParams.set('session', initialSession);
    if (bridgeOverride) {
      url.searchParams.set('bridge', bridgeOverride);
    }

    setSession(initialSession);
    setBridgeUrl(resolveBridgeUrl(window.location));
    setControllerUrl(url.toString());
    if (window.location.hostname === 'localhost' || window.location.hostname.startsWith('127.')) {
      setLanWarning('Open this page with your Mac LAN IP, not localhost, so iPhone can connect.');
    }

    if (params.get('session') !== initialSession) {
      params.set('session', initialSession);
      const nextUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState({}, '', nextUrl);
    }
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTimeTick(Date.now());
    }, 1000);
    return () => {
      window.clearInterval(interval);
    };
  }, []);

  const onSocketMessage = useCallback((message: WireMessage) => {
    if (message.session !== session) return;

    if (isControllerState(message)) {
      joyRef.current = message.joy;
      setActiveControllerId(message.clientId);
      setLastInputAt(message.t);
      return;
    }

    if (isControllerAction(message)) {
      setActiveControllerId(message.clientId);
      setLastInputAt(message.t);

      switch (message.action) {
        case 'walk_toggle':
          toggleWalkLoop();
          break;
        case 'roar':
          triggerRoar();
          break;
        case 'mode_toggle': {
          const current = useStore.getState().mode;
          requestMode(current === 'skin' ? 'skeleton' : 'skin');
          break;
        }
        case 'reset_pose':
          joyRef.current = { x: 0, y: 0 };
          setWalkLoopEnabled(false);
          setResetToken((prev) => prev + 1);
          break;
        default:
          break;
      }
      return;
    }

    if (message.type === 'status') {
      setStatusNote(message.message ?? (message.ok ? 'Connected' : 'Bridge status'));
      if (message.activeControllerId) {
        setActiveControllerId(message.activeControllerId);
      }
    }
  }, [requestMode, session, setWalkLoopEnabled, toggleWalkLoop, triggerRoar]);

  const { status, lastError } = useSessionSocket({
    role: 'mac',
    session,
    clientId: clientIdRef.current,
    bridgeUrl,
    onMessage: onSocketMessage,
  });

  const staleInput = useMemo(() => {
    if (!lastInputAt) return true;
    return timeTick - lastInputAt > ARCADE_CONFIG.staleInputMs;
  }, [lastInputAt, timeTick]);

  const formattedLastInput = useMemo(() => {
    if (!lastInputAt) return 'none';
    return new Date(lastInputAt).toLocaleTimeString();
  }, [lastInputAt]);

  const handleCopyUrl = useCallback(async () => {
    if (!controllerUrl) return;
    try {
      await navigator.clipboard.writeText(controllerUrl);
      setStatusNote('Controller URL copied');
    } catch {
      setStatusNote('Copy failed; use manual copy');
    }
  }, [controllerUrl]);

  return (
    <main style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      <ArcadeScene joyRef={joyRef} resetToken={resetToken} />

      <section
        className="glass-panel"
        style={{
          position: 'fixed',
          top: '1rem',
          left: '1rem',
          zIndex: 20,
          width: 'min(480px, calc(100vw - 2rem))',
          display: 'grid',
          gap: '0.65rem',
          padding: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
          <strong style={{ fontSize: '0.95rem', letterSpacing: '0.04em' }}>ARCADE MODE</strong>
          <span
            style={{
              fontSize: '0.8rem',
              color: statusColor(status),
              border: `1px solid ${statusColor(status)}55`,
              borderRadius: '999px',
              padding: '0.2rem 0.55rem',
            }}
          >
            {status.toUpperCase()}
          </span>
        </div>

        <div style={{ display: 'grid', gap: '0.35rem', color: 'var(--fg1)', fontSize: '0.83rem' }}>
          <div>Session: <strong style={{ color: 'var(--fg0)' }}>{session || '----'}</strong></div>
          <div>Bridge: <code>{bridgeUrl || 'ws://<host>:8787'}</code></div>
          <div>Controller: <code style={{ wordBreak: 'break-all' }}>{controllerUrl || '(loading...)'}</code></div>
          <div>Mode: <strong style={{ color: 'var(--fg0)' }}>{mode}</strong></div>
          <div>Walk Loop: <strong style={{ color: walkLoopEnabled ? '#7CF7C6' : 'var(--fg0)' }}>{walkLoopEnabled ? 'ON' : 'OFF'}</strong></div>
          <div>Audio: <strong style={{ color: audioUnlocked ? '#7CF7C6' : '#F7D154' }}>{audioUnlocked ? 'Unlocked' : 'Locked'}</strong></div>
          <div>Active Controller: <strong style={{ color: 'var(--fg0)' }}>{activeControllerId ?? 'none'}</strong></div>
          <div>Last Input: <strong style={{ color: staleInput ? '#F7D154' : 'var(--fg0)' }}>{formattedLastInput}</strong></div>
          <div>Status: <span>{lastError ?? statusNote}</span></div>
          {lanWarning && <div style={{ color: '#F7D154' }}>{lanWarning}</div>}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={requestAudioUnlock}
            style={{
              border: '1px solid rgba(124,247,198,0.45)',
              background: 'rgba(124,247,198,0.12)',
              color: 'var(--accent)',
              borderRadius: 8,
              padding: '0.45rem 0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Enable Audio
          </button>
          <button
            onClick={handleCopyUrl}
            style={{
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'rgba(255,255,255,0.07)',
              color: 'var(--fg0)',
              borderRadius: 8,
              padding: '0.45rem 0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Copy Controller URL
          </button>
          <button
            onClick={() => {
              joyRef.current = { x: 0, y: 0 };
              setWalkLoopEnabled(false);
              setResetToken((prev) => prev + 1);
            }}
            style={{
              border: '1px solid rgba(255,120,120,0.4)',
              background: 'rgba(255,120,120,0.1)',
              color: '#FF9A9A',
              borderRadius: 8,
              padding: '0.45rem 0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Reset Pose
          </button>
        </div>
      </section>

      <div
        style={{
          position: 'fixed',
          top: '1rem',
          right: '1rem',
          zIndex: 20,
          display: 'grid',
          gap: '0.5rem',
        }}
      >
        <Link
          href="/arcade/anim-lab"
          style={{
            color: 'var(--accent)',
            textDecoration: 'none',
            border: '1px solid rgba(124,247,198,0.35)',
            background: 'rgba(124,247,198,0.12)',
            padding: '0.5rem 0.8rem',
            borderRadius: 8,
            fontSize: '0.82rem',
            fontWeight: 700,
            letterSpacing: '0.04em',
          }}
        >
          Animation Lab
        </Link>
        <Link
          href="/"
          style={{
            color: 'var(--fg0)',
            textDecoration: 'none',
            border: '1px solid rgba(255,255,255,0.2)',
            background: 'rgba(10, 14, 28, 0.65)',
            padding: '0.5rem 0.8rem',
            borderRadius: 8,
            fontSize: '0.84rem',
          }}
        >
          Back To Exhibit
        </Link>
      </div>

      {!audioUnlocked && (
        <div
          style={{
            position: 'fixed',
            bottom: '1rem',
            left: '1rem',
            zIndex: 20,
            color: '#F7D154',
            fontSize: '0.78rem',
            background: 'rgba(247, 209, 84, 0.08)',
            border: '1px solid rgba(247, 209, 84, 0.25)',
            padding: '0.45rem 0.65rem',
            borderRadius: 8,
          }}
        >
          Audio locked: press Enable Audio on this Mac before remote roar SFX.
        </div>
      )}
    </main>
  );
}
