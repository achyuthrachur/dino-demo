'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  ARCADE_CONFIG,
  clamp,
  type JoyVector,
} from '@/app/_lib/arcade/config';
import { type ArcadeAction, type WireMessage } from '@/app/_lib/arcade/protocol';
import {
  createClientId,
  createSessionCode,
  resolveBridgeUrl,
  sanitizeSessionCode,
} from '@/app/_lib/arcade/session';
import { useSessionSocket } from '@/app/_lib/arcade/useSessionSocket';

const KNOB_SIZE = 94;

function statusColor(status: 'disconnected' | 'connecting' | 'connected'): string {
  if (status === 'connected') return '#7CF7C6';
  if (status === 'connecting') return '#F7D154';
  return '#FF7B7B';
}

export default function ControllerPage() {
  const [session, setSession] = useState('');
  const [bridgeUrl, setBridgeUrl] = useState('');
  const [statusNote, setStatusNote] = useState('Waiting for bridge...');
  const [deployWarning, setDeployWarning] = useState<string | null>(null);
  const [joyUi, setJoyUi] = useState<JoyVector>({ x: 0, y: 0 });

  const padRef = useRef<HTMLDivElement>(null);
  const joyRef = useRef<JoyVector>({ x: 0, y: 0 });
  const draggingRef = useRef(false);
  const clientIdRef = useRef(createClientId('phone'));
  const seqRef = useRef(1);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialSession = sanitizeSessionCode(params.get('session')) || createSessionCode();
    setSession(initialSession);
    setBridgeUrl(resolveBridgeUrl(window.location));
    const bridgeOverride = params.get('bridge');
    const hosted = window.location.hostname.includes('vercel.app');
    if (hosted && !bridgeOverride) {
      setDeployWarning(
        'Controller needs a local bridge from the Mac host. Open the Mac /arcade page running on LAN and use its generated controller URL.',
      );
    }

    if (params.get('session') !== initialSession) {
      params.set('session', initialSession);
      const nextUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState({}, '', nextUrl);
    }
  }, []);

  useEffect(() => {
    const previousTouchAction = document.body.style.touchAction;
    const previousOverscroll = document.body.style.overscrollBehavior;
    const previousOverflow = document.body.style.overflow;
    document.body.style.touchAction = 'none';
    document.body.style.overscrollBehavior = 'none';
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.touchAction = previousTouchAction;
      document.body.style.overscrollBehavior = previousOverscroll;
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const onSocketMessage = useCallback((message: WireMessage) => {
    if (message.session !== session) return;
    if (message.type === 'status') {
      setStatusNote(message.message ?? (message.ok ? 'Connected' : 'Bridge status'));
    }
    if (message.type === 'ack') {
      setStatusNote(message.ok ? 'Input acknowledged' : (message.message ?? 'Ack failed'));
    }
  }, [session]);

  const { status, lastError, send } = useSessionSocket({
    role: 'phone',
    session,
    clientId: clientIdRef.current,
    bridgeUrl,
    onMessage: onSocketMessage,
  });

  useEffect(() => {
    if (status !== 'connected' || !session) return;
    const interval = window.setInterval(() => {
      send({
        type: 'controller_state',
        session,
        clientId: clientIdRef.current,
        t: Date.now(),
        seq: seqRef.current++,
        joy: joyRef.current,
      });
    }, ARCADE_CONFIG.joystickIntervalMs);

    return () => {
      window.clearInterval(interval);
    };
  }, [send, session, status]);

  const updateJoyFromPointer = useCallback((clientX: number, clientY: number) => {
    const pad = padRef.current;
    if (!pad) return;
    const rect = pad.getBoundingClientRect();
    const radius = rect.width / 2;
    const centerX = rect.left + radius;
    const centerY = rect.top + radius;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const distance = Math.hypot(dx, dy);
    const clampedDistance = Math.min(distance, radius);
    const angle = Math.atan2(dy, dx);

    const localX = Math.cos(angle) * clampedDistance;
    const localY = Math.sin(angle) * clampedDistance;

    const normX = clamp(localX / radius, -1, 1);
    const normY = clamp((-localY) / radius, -1, 1);

    joyRef.current = { x: normX, y: normY };
    setJoyUi({ x: normX, y: normY });
  }, []);

  const releaseJoystick = useCallback(() => {
    draggingRef.current = false;
    joyRef.current = { x: 0, y: 0 };
    setJoyUi({ x: 0, y: 0 });
  }, []);

  const handleAction = useCallback((action: ArcadeAction) => {
    if (status !== 'connected') return;
    send({
      type: 'action',
      session,
      clientId: clientIdRef.current,
      t: Date.now(),
      seq: seqRef.current++,
      action,
    });
  }, [send, session, status]);

  const knobTranslate = useMemo(() => {
    const maxOffset = 88;
    return {
      x: joyUi.x * maxOffset,
      y: -joyUi.y * maxOffset,
    };
  }, [joyUi.x, joyUi.y]);

  return (
    <main
      style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        display: 'grid',
        gridTemplateRows: 'auto 1fr auto',
        gap: '1rem',
        padding: '1rem',
        background: 'radial-gradient(circle at 20% 20%, #18243d 0%, #07090d 60%)',
      }}
    >
      <header
        className="glass-panel"
        style={{
          padding: '0.8rem',
          display: 'grid',
          gap: '0.45rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong style={{ letterSpacing: '0.04em' }}>PHONE CONTROLLER</strong>
          <span
            style={{
              color: statusColor(status),
              fontSize: '0.8rem',
              border: `1px solid ${statusColor(status)}55`,
              borderRadius: '999px',
              padding: '0.18rem 0.55rem',
            }}
          >
            {status.toUpperCase()}
          </span>
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--fg1)' }}>
          Session <strong style={{ color: 'var(--fg0)' }}>{session || '----'}</strong> | Client{' '}
          <code>{clientIdRef.current}</code>
        </div>
        <div style={{ fontSize: '0.76rem', color: 'var(--fg1)' }}>
          Bridge <code>{bridgeUrl || 'ws://<host>:8787'}</code>
        </div>
        <div style={{ fontSize: '0.76rem', color: 'var(--fg1)' }}>
          Status {lastError ?? statusNote}
        </div>
        <div style={{ fontSize: '0.76rem', color: '#F7D154' }}>
          Requires Mac bridge process: `npm run bridge`
        </div>
        {deployWarning && (
          <div style={{ fontSize: '0.76rem', color: '#FFB0B0' }}>{deployWarning}</div>
        )}
      </header>

      <section
        style={{
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <div
          ref={padRef}
          role="application"
          aria-label="Joystick"
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            draggingRef.current = true;
            updateJoyFromPointer(event.clientX, event.clientY);
          }}
          onPointerMove={(event) => {
            if (!draggingRef.current) return;
            updateJoyFromPointer(event.clientX, event.clientY);
          }}
          onPointerUp={() => releaseJoystick()}
          onPointerCancel={() => releaseJoystick()}
          style={{
            width: 'min(72vw, 320px)',
            height: 'min(72vw, 320px)',
            borderRadius: '50%',
            touchAction: 'none',
            position: 'relative',
            background:
              'radial-gradient(circle at 35% 30%, rgba(124,247,198,0.26), rgba(124,247,198,0.03) 60%, rgba(255,255,255,0.02) 100%)',
            border: '1px solid rgba(124,247,198,0.32)',
            boxShadow: 'inset 0 0 24px rgba(124,247,198,0.2), 0 8px 30px rgba(0,0,0,0.35)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: `translate(calc(-50% + ${knobTranslate.x}px), calc(-50% + ${knobTranslate.y}px))`,
              width: `${KNOB_SIZE}px`,
              height: `${KNOB_SIZE}px`,
              borderRadius: '50%',
              background: 'linear-gradient(180deg, #8DFFD5 0%, #57D9A7 100%)',
              border: '2px solid rgba(8, 20, 18, 0.45)',
              boxShadow: '0 12px 24px rgba(0,0,0,0.35)',
            }}
          />
        </div>
      </section>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: '0.65rem',
        }}
      >
        <button
          onClick={() => handleAction('walk_toggle')}
          style={buttonStyle('#6FEFC4')}
        >
          Walk
        </button>
        <button
          onClick={() => handleAction('roar')}
          style={buttonStyle('#FFD166')}
        >
          Roar
        </button>
        <button
          onClick={() => handleAction('mode_toggle')}
          style={buttonStyle('#8BB7FF')}
        >
          Mode
        </button>
        <button
          onClick={() => handleAction('reset_pose')}
          style={buttonStyle('#FF9A9A')}
        >
          Reset
        </button>
      </section>
    </main>
  );
}

function buttonStyle(color: string): CSSProperties {
  return {
    appearance: 'none',
    border: `1px solid ${color}66`,
    background: `${color}22`,
    color,
    borderRadius: 12,
    minHeight: 60,
    fontWeight: 700,
    fontSize: '1rem',
    letterSpacing: '0.02em',
    touchAction: 'none',
  };
}
