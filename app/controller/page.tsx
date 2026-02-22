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
import { useAblySession } from '@/app/_lib/arcade/useAblySession';
import { useSessionSocket } from '@/app/_lib/arcade/useSessionSocket';

const KNOB_SIZE = 62;
const STICK_SIZE_PORTRAIT = 'min(30svh, clamp(96px, 30vw, 150px))';
const STICK_SIZE_LANDSCAPE = 'min(34dvh, clamp(82px, 16vw, 118px))';

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
  const [isLandscape, setIsLandscape] = useState(false);
  const [moveUi, setMoveUi] = useState<JoyVector>({ x: 0, y: 0 });
  const [aimUi, setAimUi] = useState<JoyVector>({ x: 0, y: 0 });
  const ablyKey = process.env.NEXT_PUBLIC_ABLY_KEY;
  const useAbly = Boolean(ablyKey);

  const movePadRef = useRef<HTMLDivElement>(null);
  const aimPadRef = useRef<HTMLDivElement>(null);
  const moveRef = useRef<JoyVector>({ x: 0, y: 0 });
  const aimRef = useRef<JoyVector>({ x: 0, y: 0 });
  const moveDraggingRef = useRef(false);
  const aimDraggingRef = useRef(false);
  const clientIdRef = useRef(createClientId('phone'));
  const seqRef = useRef(1);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialSession = sanitizeSessionCode(params.get('session')) || createSessionCode();
    setSession(initialSession);
    setBridgeUrl(useAbly ? 'ably://realtime' : resolveBridgeUrl(window.location));
    const bridgeOverride = params.get('bridge');
    const hosted = window.location.hostname.includes('vercel.app');
    if (hosted && !bridgeOverride && !useAbly) {
      setDeployWarning(
        'Controller needs a local bridge from the Mac host. Open the Mac /arcade page running on LAN and use its generated controller URL.',
      );
    }

    if (params.get('session') !== initialSession) {
      params.set('session', initialSession);
      const nextUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState({}, '', nextUrl);
    }
  }, [useAbly]);

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

  useEffect(() => {
    const updateOrientation = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };
    updateOrientation();
    window.addEventListener('resize', updateOrientation);
    window.addEventListener('orientationchange', updateOrientation);
    return () => {
      window.removeEventListener('resize', updateOrientation);
      window.removeEventListener('orientationchange', updateOrientation);
    };
  }, []);

  useEffect(() => {
    if (!isLandscape) return;
    const orientationApi = screen.orientation as ScreenOrientation & {
      lock?: (orientation: 'landscape') => Promise<void>;
    };
    if (!orientationApi?.lock) return;
    void orientationApi.lock('landscape').catch(() => {
      // iOS Safari does not support orientation lock for regular pages.
    });
  }, [isLandscape]);

  const onSocketMessage = useCallback((message: WireMessage) => {
    if (message.session !== session) return;
    if (message.type === 'status') {
      setStatusNote(message.message ?? (message.ok ? 'Connected' : 'Bridge status'));
    }
    if (message.type === 'ack') {
      setStatusNote(message.ok ? 'Input acknowledged' : (message.message ?? 'Ack failed'));
    }
  }, [session]);

  const socketTransport = useSessionSocket({
    enabled: !useAbly,
    role: 'phone',
    session,
    clientId: clientIdRef.current,
    bridgeUrl,
    onMessage: onSocketMessage,
  });

  const ablyTransport = useAblySession({
    enabled: useAbly,
    ablyKey,
    role: 'phone',
    session,
    clientId: clientIdRef.current,
    onMessage: onSocketMessage,
  });

  const status = useAbly ? ablyTransport.status : socketTransport.status;
  const lastError = useAbly ? ablyTransport.lastError : socketTransport.lastError;
  const send = useCallback((message: WireMessage) => {
    if (useAbly) return ablyTransport.send(message);
    return socketTransport.send(message);
  }, [ablyTransport, socketTransport, useAbly]);

  useEffect(() => {
    if (status !== 'connected' || !session) return;
    const interval = window.setInterval(() => {
      send({
        type: 'controller_state',
        session,
        clientId: clientIdRef.current,
        t: Date.now(),
        seq: seqRef.current++,
        move: moveRef.current,
        aim: aimRef.current,
      });
    }, ARCADE_CONFIG.joystickIntervalMs);

    return () => {
      window.clearInterval(interval);
    };
  }, [send, session, status]);

  const vectorFromPadPointer = useCallback((pad: HTMLDivElement | null, clientX: number, clientY: number) => {
    if (!pad) return null;
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

    return {
      x: clamp(localX / radius, -1, 1),
      y: clamp((-localY) / radius, -1, 1),
    } as JoyVector;
  }, []);

  const updateMoveFromPointer = useCallback((clientX: number, clientY: number) => {
    const vector = vectorFromPadPointer(movePadRef.current, clientX, clientY);
    if (!vector) return;
    moveRef.current = vector;
    setMoveUi(vector);
  }, [vectorFromPadPointer]);

  const updateAimFromPointer = useCallback((clientX: number, clientY: number) => {
    const vector = vectorFromPadPointer(aimPadRef.current, clientX, clientY);
    if (!vector) return;
    aimRef.current = vector;
    setAimUi(vector);
  }, [vectorFromPadPointer]);

  const releaseMoveStick = useCallback(() => {
    moveDraggingRef.current = false;
    moveRef.current = { x: 0, y: 0 };
    setMoveUi({ x: 0, y: 0 });
  }, []);

  const releaseAimStick = useCallback(() => {
    aimDraggingRef.current = false;
    aimRef.current = { x: 0, y: 0 };
    setAimUi({ x: 0, y: 0 });
  }, []);

  const handleAction = useCallback((action: ArcadeAction): boolean => {
    if (status !== 'connected') return false;
    return send({
      type: 'action',
      session,
      clientId: clientIdRef.current,
      t: Date.now(),
      seq: seqRef.current++,
      action,
    });
  }, [send, session, status]);

  const handleReset = useCallback(() => {
    const sent = handleAction('reset_pose');
    if (!sent) return;
    releaseMoveStick();
    releaseAimStick();
  }, [handleAction, releaseAimStick, releaseMoveStick]);

  const moveKnobTranslate = useMemo(() => {
    const maxOffset = 82;
    return {
      x: moveUi.x * maxOffset,
      y: -moveUi.y * maxOffset,
    };
  }, [moveUi.x, moveUi.y]);

  const aimKnobTranslate = useMemo(() => {
    const maxOffset = 82;
    return {
      x: aimUi.x * maxOffset,
      y: -aimUi.y * maxOffset,
    };
  }, [aimUi.x, aimUi.y]);

  const stickSize = isLandscape ? STICK_SIZE_LANDSCAPE : STICK_SIZE_PORTRAIT;

  const actionButtons = (
    <>
      <button onClick={() => handleAction('anim_minion_spawn')} style={buttonStyle('#FFD166', isLandscape)}>
        Minion Spawn
      </button>
      <button onClick={() => handleAction('anim_next_round')} style={buttonStyle('#8BB7FF', isLandscape)}>
        Next Round
      </button>
      <button onClick={() => handleAction('anim_player_spawn')} style={buttonStyle('#8BB7FF', isLandscape)}>
        Player Spawn
      </button>
      <button onClick={() => handleAction('anim_spawn')} style={buttonStyle('#8BB7FF', isLandscape)}>
        Raid Spawn
      </button>
      <button onClick={() => handleAction('anim_victory')} style={buttonStyle('#FFD166', isLandscape)}>
        Victory
      </button>
      <button onClick={handleReset} style={buttonStyle('#FF9A9A', isLandscape)}>
        Reset
      </button>
    </>
  );

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
        gridTemplateRows: isLandscape ? 'auto 1fr' : 'auto 1fr auto',
        gap: isLandscape ? '0.34rem' : '0.45rem',
        padding: isLandscape ? '0.44rem' : '0.6rem',
        background: 'radial-gradient(circle at 20% 20%, #18243d 0%, #07090d 60%)',
      }}
    >
      <header
        className="glass-panel"
        style={{
          padding: isLandscape ? '0.42rem 0.52rem' : '0.52rem 0.62rem',
          display: 'grid',
          gap: isLandscape ? '0.18rem' : '0.24rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong style={{ letterSpacing: '0.04em', fontSize: isLandscape ? '0.86rem' : '1rem' }}>PHONE CONTROLLER</strong>
          <span
            style={{
              color: statusColor(status),
              fontSize: isLandscape ? '0.7rem' : '0.8rem',
              border: `1px solid ${statusColor(status)}55`,
              borderRadius: '999px',
              padding: '0.18rem 0.55rem',
            }}
          >
            {status.toUpperCase()}
          </span>
        </div>
        <div style={{ fontSize: isLandscape ? '0.68rem' : '0.74rem', color: 'var(--fg1)', lineHeight: 1.2 }}>
          Session <strong style={{ color: 'var(--fg0)' }}>{session || '----'}</strong> | Client{' '}
          <code>{clientIdRef.current}</code>
        </div>
        <div style={{ fontSize: isLandscape ? '0.67rem' : '0.72rem', color: 'var(--fg1)', lineHeight: 1.2 }}>
          Left stick: tank walk | Right stick: camera pan
        </div>
        <div style={{ fontSize: isLandscape ? '0.67rem' : '0.72rem', color: 'var(--fg1)', lineHeight: 1.2 }}>
          Status {lastError ?? statusNote}
        </div>
        {!isLandscape && !useAbly && (
          <div style={{ fontSize: '0.68rem', color: '#F7D154', lineHeight: 1.2 }}>
            Requires Mac bridge process: `npm run bridge`
          </div>
        )}
        {!isLandscape && deployWarning && (
          <div style={{ fontSize: '0.68rem', color: '#FFB0B0', lineHeight: 1.2 }}>{deployWarning}</div>
        )}
      </header>

      {isLandscape ? (
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1.2fr)',
            gap: '0.45rem',
            alignItems: 'center',
            minHeight: 0,
          }}
        >
          <div style={{ display: 'grid', justifyItems: 'center', gap: '0.22rem' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--fg1)', letterSpacing: '0.03em' }}>Move (Tank)</div>
            <div
              ref={movePadRef}
              role="application"
              aria-label="Move joystick"
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                moveDraggingRef.current = true;
                updateMoveFromPointer(event.clientX, event.clientY);
              }}
              onPointerMove={(event) => {
                if (!moveDraggingRef.current) return;
                updateMoveFromPointer(event.clientX, event.clientY);
              }}
              onPointerUp={() => releaseMoveStick()}
              onPointerCancel={() => releaseMoveStick()}
              style={stickPadStyle('rgba(124,247,198,0.30)', 'rgba(124,247,198,0.24)', stickSize)}
            >
              <div
                style={{
                  ...stickKnobStyle,
                  transform: `translate(calc(-50% + ${moveKnobTranslate.x}px), calc(-50% + ${moveKnobTranslate.y}px))`,
                  background: 'linear-gradient(180deg, #8DFFD5 0%, #57D9A7 100%)',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', justifyItems: 'center', gap: '0.22rem' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--fg1)', letterSpacing: '0.03em' }}>Camera</div>
            <div
              ref={aimPadRef}
              role="application"
              aria-label="Rotate joystick"
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                aimDraggingRef.current = true;
                updateAimFromPointer(event.clientX, event.clientY);
              }}
              onPointerMove={(event) => {
                if (!aimDraggingRef.current) return;
                updateAimFromPointer(event.clientX, event.clientY);
              }}
              onPointerUp={() => releaseAimStick()}
              onPointerCancel={() => releaseAimStick()}
              style={stickPadStyle('rgba(139,183,255,0.34)', 'rgba(139,183,255,0.22)', stickSize)}
            >
              <div
                style={{
                  ...stickKnobStyle,
                  transform: `translate(calc(-50% + ${aimKnobTranslate.x}px), calc(-50% + ${aimKnobTranslate.y}px))`,
                  background: 'linear-gradient(180deg, #B8D2FF 0%, #7EA9F8 100%)',
                }}
              />
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: '0.36rem',
              alignContent: 'center',
            }}
          >
            {actionButtons}
          </div>
        </section>
      ) : (
        <>
          <section
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: '0.45rem',
              alignItems: 'center',
              minHeight: 0,
            }}
          >
            <div style={{ display: 'grid', justifyItems: 'center', gap: '0.28rem' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--fg1)', letterSpacing: '0.03em' }}>Move (Tank)</div>
              <div
                ref={movePadRef}
                role="application"
                aria-label="Move joystick"
                onPointerDown={(event) => {
                  event.currentTarget.setPointerCapture(event.pointerId);
                  moveDraggingRef.current = true;
                  updateMoveFromPointer(event.clientX, event.clientY);
                }}
                onPointerMove={(event) => {
                  if (!moveDraggingRef.current) return;
                  updateMoveFromPointer(event.clientX, event.clientY);
                }}
                onPointerUp={() => releaseMoveStick()}
                onPointerCancel={() => releaseMoveStick()}
                style={stickPadStyle('rgba(124,247,198,0.30)', 'rgba(124,247,198,0.24)', stickSize)}
              >
                <div
                  style={{
                    ...stickKnobStyle,
                    transform: `translate(calc(-50% + ${moveKnobTranslate.x}px), calc(-50% + ${moveKnobTranslate.y}px))`,
                    background: 'linear-gradient(180deg, #8DFFD5 0%, #57D9A7 100%)',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', justifyItems: 'center', gap: '0.28rem' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--fg1)', letterSpacing: '0.03em' }}>Camera</div>
              <div
                ref={aimPadRef}
                role="application"
                aria-label="Rotate joystick"
                onPointerDown={(event) => {
                  event.currentTarget.setPointerCapture(event.pointerId);
                  aimDraggingRef.current = true;
                  updateAimFromPointer(event.clientX, event.clientY);
                }}
                onPointerMove={(event) => {
                  if (!aimDraggingRef.current) return;
                  updateAimFromPointer(event.clientX, event.clientY);
                }}
                onPointerUp={() => releaseAimStick()}
                onPointerCancel={() => releaseAimStick()}
                style={stickPadStyle('rgba(139,183,255,0.34)', 'rgba(139,183,255,0.22)', stickSize)}
              >
                <div
                  style={{
                    ...stickKnobStyle,
                    transform: `translate(calc(-50% + ${aimKnobTranslate.x}px), calc(-50% + ${aimKnobTranslate.y}px))`,
                    background: 'linear-gradient(180deg, #B8D2FF 0%, #7EA9F8 100%)',
                  }}
                />
              </div>
            </div>
          </section>

          <section
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: '0.42rem',
            }}
          >
            {actionButtons}
          </section>
        </>
      )}
    </main>
  );
}

function stickPadStyle(borderColor: string, glowColor: string, size: string): CSSProperties {
  return {
    width: size,
    height: size,
    borderRadius: '50%',
    touchAction: 'none',
    position: 'relative',
    background:
      `radial-gradient(circle at 35% 30%, ${glowColor}, rgba(255,255,255,0.03) 60%, rgba(255,255,255,0.02) 100%)`,
    border: `1px solid ${borderColor}`,
    boxShadow: 'inset 0 0 22px rgba(255,255,255,0.08), 0 8px 30px rgba(0,0,0,0.35)',
  };
}

const stickKnobStyle: CSSProperties = {
  position: 'absolute',
  left: '50%',
  top: '50%',
  width: `${KNOB_SIZE}px`,
  height: `${KNOB_SIZE}px`,
  borderRadius: '50%',
  border: '2px solid rgba(8, 20, 18, 0.45)',
  boxShadow: '0 12px 24px rgba(0,0,0,0.35)',
};

function buttonStyle(color: string, compact = false): CSSProperties {
  return {
    appearance: 'none',
    border: `1px solid ${color}66`,
    background: `${color}22`,
    color,
    borderRadius: 12,
    minHeight: compact ? 'clamp(30px, 8dvh, 40px)' : 'clamp(36px, 5.2dvh, 46px)',
    fontWeight: 700,
    fontSize: compact ? '0.72rem' : '0.76rem',
    letterSpacing: '0.02em',
    touchAction: 'none',
  };
}
