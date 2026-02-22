'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import QRCode from 'qrcode';
import {
  ArcadeScene,
  type ArcadeAnimCueKind,
  type RotationMode,
  type WalkDirection,
} from '@/app/_components/ArcadeScene';
import { ARCADE_CONFIG, type JoyVector } from '@/app/_lib/arcade/config';
import { isControllerAction, isControllerState, type WireMessage } from '@/app/_lib/arcade/protocol';
import {
  createClientId,
  createSessionCode,
  resolveBridgeUrl,
  sanitizeSessionCode,
} from '@/app/_lib/arcade/session';
import { useAblySession } from '@/app/_lib/arcade/useAblySession';
import { useSessionSocket } from '@/app/_lib/arcade/useSessionSocket';

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
  const [deployWarning, setDeployWarning] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [panelHidden, setPanelHidden] = useState(false);
  const [walkEnabled, setWalkEnabled] = useState(false);
  const [walkDirection, setWalkDirection] = useState<WalkDirection>('forward');
  const [rotationMode, setRotationMode] = useState<RotationMode>('off');
  const [animationCue, setAnimationCue] = useState<{ kind: ArcadeAnimCueKind; nonce: number } | null>(
    null,
  );

  const joyRef = useRef<JoyVector>({ x: 0, y: 0 });
  const clientIdRef = useRef(createClientId('mac'));
  const cueNonceRef = useRef(1);
  const ablyKey = process.env.NEXT_PUBLIC_ABLY_KEY;
  const useAbly = Boolean(ablyKey);

  const triggerAnimation = useCallback((kind: ArcadeAnimCueKind) => {
    setAnimationCue({
      kind,
      nonce: cueNonceRef.current++,
    });
  }, []);

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
    setBridgeUrl(useAbly ? 'ably://realtime' : resolveBridgeUrl(window.location));
    setControllerUrl(url.toString());
    const hosted = window.location.hostname.includes('vercel.app');
    if (hosted && !bridgeOverride && !useAbly) {
      setDeployWarning(
        'This deployed URL cannot host the local WebSocket bridge. Run `npm run bridge` + `npm run dev:lan`, then open /arcade on your Mac LAN IP.',
      );
    }
    if (
      !useAbly &&
      (window.location.hostname === 'localhost' || window.location.hostname.startsWith('127.'))
    ) {
      setLanWarning('Open this page with your Mac LAN IP, not localhost, so iPhone can connect.');
    }

    if (params.get('session') !== initialSession) {
      params.set('session', initialSession);
      const nextUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState({}, '', nextUrl);
    }
  }, [useAbly]);

  useEffect(() => {
    let cancelled = false;
    if (!controllerUrl) {
      setQrDataUrl('');
      return;
    }

    QRCode.toDataURL(controllerUrl, {
      width: 220,
      margin: 1,
      color: {
        dark: '#EAF0FF',
        light: '#00000000',
      },
    })
      .then((url: string) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl('');
      });

    return () => {
      cancelled = true;
    };
  }, [controllerUrl]);

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
          setWalkEnabled((previous) => !previous);
          break;
        case 'walk_forward':
          setWalkDirection('forward');
          break;
        case 'walk_reverse':
          setWalkDirection('reverse');
          break;
        case 'rotate_left':
          setRotationMode('left');
          break;
        case 'rotate_right':
          setRotationMode('right');
          break;
        case 'rotate_off':
          setRotationMode('off');
          break;
        case 'anim_minion_spawn':
          triggerAnimation('minion_spawn');
          break;
        case 'anim_next_round':
          triggerAnimation('next_round');
          break;
        case 'anim_player_spawn':
          triggerAnimation('player_spawn');
          break;
        case 'anim_spawn':
          triggerAnimation('spawn');
          break;
        case 'anim_victory':
          triggerAnimation('victory');
          break;
        case 'roar':
          triggerAnimation('spawn');
          break;
        case 'mode_toggle':
          triggerAnimation('next_round');
          break;
        case 'reset_pose': {
          joyRef.current = { x: 0, y: 0 };
          setWalkEnabled(false);
          setWalkDirection('forward');
          setRotationMode('off');
          setAnimationCue(null);
          setResetToken((prev) => prev + 1);
          break;
        }
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
  }, [session, triggerAnimation]);

  const socketTransport = useSessionSocket({
    enabled: !useAbly,
    role: 'mac',
    session,
    clientId: clientIdRef.current,
    bridgeUrl,
    onMessage: onSocketMessage,
  });

  const ablyTransport = useAblySession({
    enabled: useAbly,
    ablyKey,
    role: 'mac',
    session,
    clientId: clientIdRef.current,
    onMessage: onSocketMessage,
  });

  const status = useAbly ? ablyTransport.status : socketTransport.status;
  const lastError = useAbly ? ablyTransport.lastError : socketTransport.lastError;

  const staleInput = useMemo(() => {
    if (!lastInputAt) return true;
    return timeTick - lastInputAt > ARCADE_CONFIG.staleInputMs;
  }, [lastInputAt, timeTick]);

  const formattedLastInput = useMemo(() => {
    if (!lastInputAt) return 'none';
    return new Date(lastInputAt).toLocaleTimeString();
  }, [lastInputAt]);

  const controllerActive = status === 'connected' && Boolean(activeControllerId) && !staleInput;

  useEffect(() => {
    if (controllerActive) {
      setPanelHidden(true);
    }
  }, [controllerActive]);

  useEffect(() => {
    if (status !== 'connected') {
      setPanelHidden(false);
    }
  }, [status]);

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
      <ArcadeScene
        joyRef={joyRef}
        resetToken={resetToken}
        walkEnabled={walkEnabled}
        walkDirection={walkDirection}
        rotationMode={rotationMode}
        animationCue={animationCue}
      />

      {!panelHidden && (
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
            <div>Transport: <code>{useAbly ? 'ably-realtime' : 'local-websocket'}</code></div>
            <div>Bridge: <code>{bridgeUrl || 'ws://<host>:8787'}</code></div>
            <div>Controller: <code style={{ wordBreak: 'break-all' }}>{controllerUrl || '(loading...)'}</code></div>
            <div>Walk: <strong style={{ color: walkEnabled ? '#7CF7C6' : 'var(--fg0)' }}>{walkEnabled ? 'ON' : 'OFF'}</strong></div>
            <div>Direction: <strong style={{ color: 'var(--fg0)' }}>{walkDirection}</strong></div>
            <div>Rotation: <strong style={{ color: 'var(--fg0)' }}>{rotationMode}</strong></div>
            <div>Active Controller: <strong style={{ color: 'var(--fg0)' }}>{activeControllerId ?? 'none'}</strong></div>
            <div>Last Input: <strong style={{ color: staleInput ? '#F7D154' : 'var(--fg0)' }}>{formattedLastInput}</strong></div>
            <div>Status: <span>{lastError ?? statusNote}</span></div>
            {!useAbly && <div style={{ color: '#F7D154' }}>Bridge process required on Mac: `npm run bridge`</div>}
            {deployWarning && <div style={{ color: '#FFB0B0' }}>{deployWarning}</div>}
            {lanWarning && <div style={{ color: '#F7D154' }}>{lanWarning}</div>}
          </div>

          {qrDataUrl && (
            <div style={{ display: 'grid', justifyItems: 'start', gap: '0.35rem' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--fg1)' }}>
                Scan with iPhone camera:
              </div>
              <img
                src={qrDataUrl}
                alt="Controller URL QR code"
                width={160}
                height={160}
                style={{
                  width: 160,
                  height: 160,
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.24)',
                  background: 'rgba(255,255,255,0.03)',
                }}
              />
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
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
                setWalkEnabled(false);
                setWalkDirection('forward');
                setRotationMode('off');
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
      )}

      {panelHidden && (
        <button
          onClick={() => setPanelHidden(false)}
          style={{
            position: 'fixed',
            top: '1rem',
            left: '1rem',
            zIndex: 20,
            border: '1px solid rgba(255,255,255,0.2)',
            background: 'rgba(10, 14, 28, 0.78)',
            color: 'var(--fg0)',
            borderRadius: 8,
            padding: '0.4rem 0.6rem',
            fontSize: '0.76rem',
            cursor: 'pointer',
          }}
        >
          Connection
        </button>
      )}

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
    </main>
  );
}
