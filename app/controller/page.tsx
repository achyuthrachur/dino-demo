'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { ARCADE_CONFIG, clamp, type JoyVector } from '@/app/_lib/arcade/config';
import { type ArcadeAction, type WireMessage } from '@/app/_lib/arcade/protocol';
import {
  createClientId,
  createSessionCode,
  resolveBridgeUrl,
  sanitizeSessionCode,
} from '@/app/_lib/arcade/session';
import { useAblySession } from '@/app/_lib/arcade/useAblySession';
import { useSessionSocket } from '@/app/_lib/arcade/useSessionSocket';

// ─── constants ────────────────────────────────────────────────────────────────

const KNOB_SIZE = 54;
const PAD_PORTRAIT  = 'min(40svh, 46vw)';
const PAD_LANDSCAPE = 'min(64dvh, 27vw)';
const MONO = "ui-monospace,'SF Mono','Fira Code',monospace";

// cardinal-hint base style (shared)
const HINT: CSSProperties = {
  position: 'absolute', fontSize: 8, lineHeight: 1,
  color: 'rgba(255,255,255,0.12)', pointerEvents: 'none',
  fontFamily: MONO, userSelect: 'none',
};

// knob base (shared between both sticks)
const KNOB: CSSProperties = {
  position: 'absolute', left: '50%', top: '50%',
  width: KNOB_SIZE, height: KNOB_SIZE,
  borderRadius: '50%',
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function statusColor(s: 'disconnected' | 'connecting' | 'connected'): string {
  return s === 'connected' ? '#00FFB3' : s === 'connecting' ? '#FFB300' : '#FF4455';
}

function padStyle(accent: string, size: string): CSSProperties {
  return {
    width: size, height: size,
    borderRadius: '50%', touchAction: 'none', position: 'relative', flexShrink: 0,
    background: 'radial-gradient(circle at 32% 28%, rgba(255,255,255,0.042) 0%, #0D1018 55%, #090B10 100%)',
    border: `1.5px solid ${accent}38`,
    boxShadow: `inset 0 0 32px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.032), inset 0 0 0 1px ${accent}12`,
  };
}

function btnStyle(color: string, compact: boolean): CSSProperties {
  return {
    appearance: 'none',
    border: `1px solid ${color}38`,
    background: `${color}12`,
    color: `${color}BB`,
    borderRadius: 7,
    minHeight: compact ? 36 : 44,
    fontSize: compact ? 10 : 11,
    fontWeight: 700,
    letterSpacing: '0.1em',
    touchAction: 'manipulation',
    cursor: 'pointer',
    fontFamily: MONO,
    boxShadow: `inset 0 1px 0 ${color}1E, 0 1px 3px rgba(0,0,0,0.45)`,
    padding: 0,
  };
}

// ─── component ────────────────────────────────────────────────────────────────

export default function ControllerPage() {
  const [session, setSession]           = useState('');
  const [bridgeUrl, setBridgeUrl]       = useState('');
  const [statusNote, setStatusNote]     = useState('Waiting for bridge...');
  const [deployWarning, setDeployWarning] = useState<string | null>(null);
  const [isLandscape, setIsLandscape]   = useState(false);
  const [moveUi, setMoveUi]             = useState<JoyVector>({ x: 0, y: 0 });
  const [aimUi,  setAimUi]              = useState<JoyVector>({ x: 0, y: 0 });

  const ablyKey  = process.env.NEXT_PUBLIC_ABLY_KEY;
  const useAbly  = Boolean(ablyKey);

  const movePadRef       = useRef<HTMLDivElement>(null);
  const aimPadRef        = useRef<HTMLDivElement>(null);
  const moveRef          = useRef<JoyVector>({ x: 0, y: 0 });
  const aimRef           = useRef<JoyVector>({ x: 0, y: 0 });
  const moveDraggingRef  = useRef(false);
  const aimDraggingRef   = useRef(false);
  const clientIdRef      = useRef(createClientId('phone'));
  const seqRef           = useRef(1);

  // ── session + bridge init ──────────────────────────────────────────────────
  useEffect(() => {
    const params          = new URLSearchParams(window.location.search);
    const initialSession  = sanitizeSessionCode(params.get('session')) || createSessionCode();
    setSession(initialSession);
    setBridgeUrl(useAbly ? 'ably://realtime' : resolveBridgeUrl(window.location));
    const bridgeOverride  = params.get('bridge');
    const hosted          = window.location.hostname.includes('vercel.app');
    if (hosted && !bridgeOverride && !useAbly) {
      setDeployWarning('Needs local bridge from Mac /arcade page.');
    }
    if (params.get('session') !== initialSession) {
      params.set('session', initialSession);
      window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
    }
  }, [useAbly]);

  // ── prevent scroll / overscroll ───────────────────────────────────────────
  useEffect(() => {
    const prev = {
      ta: document.body.style.touchAction,
      os: document.body.style.overscrollBehavior,
      ov: document.body.style.overflow,
    };
    document.body.style.touchAction        = 'none';
    document.body.style.overscrollBehavior = 'none';
    document.body.style.overflow           = 'hidden';
    return () => {
      document.body.style.touchAction        = prev.ta;
      document.body.style.overscrollBehavior = prev.os;
      document.body.style.overflow           = prev.ov;
    };
  }, []);

  // ── orientation ───────────────────────────────────────────────────────────
  useEffect(() => {
    const update = () => setIsLandscape(window.innerWidth > window.innerHeight);
    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  useEffect(() => {
    if (!isLandscape) return;
    const api = screen.orientation as ScreenOrientation & { lock?: (o: 'landscape') => Promise<void> };
    if (api?.lock) void api.lock('landscape').catch(() => {});
  }, [isLandscape]);

  // ── transport ─────────────────────────────────────────────────────────────
  const onSocketMessage = useCallback((message: WireMessage) => {
    if (message.session !== session) return;
    if (message.type === 'status') setStatusNote(message.message ?? (message.ok ? 'Connected' : 'Bridge status'));
    if (message.type === 'ack')    setStatusNote(message.ok ? 'Input acknowledged' : (message.message ?? 'Ack failed'));
  }, [session]);

  const socketTransport = useSessionSocket({
    enabled: !useAbly, role: 'phone', session,
    clientId: clientIdRef.current, bridgeUrl, onMessage: onSocketMessage,
  });
  const ablyTransport = useAblySession({
    enabled: useAbly, ablyKey, role: 'phone',
    session, clientId: clientIdRef.current, onMessage: onSocketMessage,
  });

  const status    = useAbly ? ablyTransport.status    : socketTransport.status;
  const lastError = useAbly ? ablyTransport.lastError : socketTransport.lastError;

  const send = useCallback((message: WireMessage) => {
    if (useAbly) return ablyTransport.send(message);
    return socketTransport.send(message);
  }, [ablyTransport, socketTransport, useAbly]);

  // ── joystick polling ──────────────────────────────────────────────────────
  useEffect(() => {
    if (status !== 'connected' || !session) return;
    const id = window.setInterval(() => {
      send({
        type: 'controller_state', session,
        clientId: clientIdRef.current,
        t: Date.now(), seq: seqRef.current++,
        move: moveRef.current, aim: aimRef.current,
      });
    }, ARCADE_CONFIG.joystickIntervalMs);
    return () => window.clearInterval(id);
  }, [send, session, status]);

  // ── vector math ───────────────────────────────────────────────────────────
  const vectorFromPadPointer = useCallback((pad: HTMLDivElement | null, clientX: number, clientY: number) => {
    if (!pad) return null;
    const rect   = pad.getBoundingClientRect();
    const radius = rect.width / 2;
    const dx     = clientX - (rect.left + radius);
    const dy     = clientY - (rect.top  + radius);
    const clamped = Math.min(Math.hypot(dx, dy), radius);
    const angle   = Math.atan2(dy, dx);
    return {
      x: clamp(Math.cos(angle) * clamped / radius, -1, 1),
      y: clamp(-Math.sin(angle) * clamped / radius, -1, 1),
    } as JoyVector;
  }, []);

  const updateMoveFromPointer = useCallback((cx: number, cy: number) => {
    const v = vectorFromPadPointer(movePadRef.current, cx, cy);
    if (!v) return;
    moveRef.current = v;
    setMoveUi(v);
  }, [vectorFromPadPointer]);

  const updateAimFromPointer = useCallback((cx: number, cy: number) => {
    const v = vectorFromPadPointer(aimPadRef.current, cx, cy);
    if (!v) return;
    aimRef.current = v;
    setAimUi(v);
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

  // ── action dispatch ───────────────────────────────────────────────────────
  const handleAction = useCallback((action: ArcadeAction): boolean => {
    if (status !== 'connected') return false;
    return send({
      type: 'action', session,
      clientId: clientIdRef.current,
      t: Date.now(), seq: seqRef.current++, action,
    });
  }, [send, session, status]);

  const handleReset = useCallback(() => {
    const sent = handleAction('reset_pose');
    if (!sent) return;
    releaseMoveStick();
    releaseAimStick();
  }, [handleAction, releaseAimStick, releaseMoveStick]);

  // ── knob positions ────────────────────────────────────────────────────────
  const moveKnob = useMemo(() => ({ x: moveUi.x * 56, y: -moveUi.y * 56 }), [moveUi.x, moveUi.y]);
  const aimKnob  = useMemo(() => ({ x: aimUi.x  * 56, y: -aimUi.y  * 56 }), [aimUi.x,  aimUi.y]);

  // ── derived display values ────────────────────────────────────────────────
  const sc          = statusColor(status);
  const statusLabel = status === 'connected' ? 'LIVE' : status === 'connecting' ? 'SYNC' : 'OFF';
  const errorLine   = lastError ?? (status !== 'connected' ? (deployWarning ?? statusNote) : null);
  const padSize     = isLandscape ? PAD_LANDSCAPE : PAD_PORTRAIT;

  // ── joystick elements ─────────────────────────────────────────────────────

  const moveStick = (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5 }}>
      <div
        ref={movePadRef}
        role="application"
        aria-label="Move joystick"
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); moveDraggingRef.current = true; updateMoveFromPointer(e.clientX, e.clientY); }}
        onPointerMove={(e) => { if (!moveDraggingRef.current) return; updateMoveFromPointer(e.clientX, e.clientY); }}
        onPointerUp={releaseMoveStick}
        onPointerCancel={releaseMoveStick}
        style={padStyle('#00FFB3', padSize)}
      >
        {/* crosshair */}
        <div style={{ position:'absolute', inset:0, pointerEvents:'none', borderRadius:'50%',
          background:'linear-gradient(transparent calc(50% - 0.5px),rgba(0,255,179,0.09) calc(50% - 0.5px) calc(50% + 0.5px),transparent calc(50% + 0.5px)),linear-gradient(90deg,transparent calc(50% - 0.5px),rgba(0,255,179,0.09) calc(50% - 0.5px) calc(50% + 0.5px),transparent calc(50% + 0.5px))' }} />
        {/* inner ring */}
        <div style={{ position:'absolute', width:'62%', height:'62%', left:'19%', top:'19%', borderRadius:'50%', border:'1px solid rgba(0,255,179,0.07)', pointerEvents:'none' }} />
        {/* cardinal hints */}
        <span style={{ ...HINT, top:9, left:'50%', transform:'translateX(-50%)' }}>▲</span>
        <span style={{ ...HINT, bottom:9, left:'50%', transform:'translateX(-50%)' }}>▼</span>
        {/* knob */}
        <div style={{ ...KNOB,
          background:'radial-gradient(circle at 34% 28%,#AAFEE2,#3DB57A 52%,#1A7A52)',
          transform:`translate(calc(-50% + ${moveKnob.x}px),calc(-50% + ${moveKnob.y}px))`,
          boxShadow:'0 6px 18px rgba(0,0,0,0.65),0 0 0 2px rgba(0,255,179,0.18),inset 0 1px 0 rgba(255,255,255,0.3)',
        }} />
      </div>
      <span style={{ fontSize:9, letterSpacing:'0.22em', color:'rgba(0,255,179,0.42)', fontWeight:600, fontFamily:MONO }}>MOVE</span>
    </div>
  );

  const aimStick = (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5 }}>
      <div
        ref={aimPadRef}
        role="application"
        aria-label="Camera joystick"
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); aimDraggingRef.current = true; updateAimFromPointer(e.clientX, e.clientY); }}
        onPointerMove={(e) => { if (!aimDraggingRef.current) return; updateAimFromPointer(e.clientX, e.clientY); }}
        onPointerUp={releaseAimStick}
        onPointerCancel={releaseAimStick}
        style={padStyle('#54C0E8', padSize)}
      >
        {/* crosshair */}
        <div style={{ position:'absolute', inset:0, pointerEvents:'none', borderRadius:'50%',
          background:'linear-gradient(transparent calc(50% - 0.5px),rgba(84,192,232,0.09) calc(50% - 0.5px) calc(50% + 0.5px),transparent calc(50% + 0.5px)),linear-gradient(90deg,transparent calc(50% - 0.5px),rgba(84,192,232,0.09) calc(50% - 0.5px) calc(50% + 0.5px),transparent calc(50% + 0.5px))' }} />
        {/* inner ring */}
        <div style={{ position:'absolute', width:'62%', height:'62%', left:'19%', top:'19%', borderRadius:'50%', border:'1px solid rgba(84,192,232,0.07)', pointerEvents:'none' }} />
        {/* cardinal hints */}
        <span style={{ ...HINT, top:'50%', left:9, transform:'translateY(-50%)' }}>◀</span>
        <span style={{ ...HINT, top:'50%', right:9, transform:'translateY(-50%)' }}>▶</span>
        {/* knob */}
        <div style={{ ...KNOB,
          background:'radial-gradient(circle at 34% 28%,#CDE8FF,#4A97D4 52%,#2060A8)',
          transform:`translate(calc(-50% + ${aimKnob.x}px),calc(-50% + ${aimKnob.y}px))`,
          boxShadow:'0 6px 18px rgba(0,0,0,0.65),0 0 0 2px rgba(84,192,232,0.18),inset 0 1px 0 rgba(255,255,255,0.3)',
        }} />
      </div>
      <span style={{ fontSize:9, letterSpacing:'0.22em', color:'rgba(84,192,232,0.42)', fontWeight:600, fontFamily:MONO }}>CAM</span>
    </div>
  );

  // ── action buttons ────────────────────────────────────────────────────────

  const btns = (
    <>
      <button onClick={() => handleAction('anim_spawn')}        style={btnStyle('#F5A800', isLandscape)}>SPAWN</button>
      <button onClick={() => handleAction('anim_minion_spawn')} style={btnStyle('#54C0E8', isLandscape)}>MINION</button>
      <button onClick={() => handleAction('anim_player_spawn')} style={btnStyle('#54C0E8', isLandscape)}>PLAYER</button>
      <button onClick={() => handleAction('anim_next_round')}   style={btnStyle('#54C0E8', isLandscape)}>ROUND</button>
      <button onClick={() => handleAction('anim_victory')}      style={btnStyle('#F5A800', isLandscape)}>VICTORY</button>
      <button onClick={handleReset}                             style={btnStyle('#FF4455', isLandscape)}>RESET</button>
    </>
  );

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <main style={{
      width: '100svw',
      height: '100svh',
      overflow: 'hidden',
      touchAction: 'none',
      userSelect: 'none',
      WebkitUserSelect: 'none',
      display: 'flex',
      flexDirection: 'column',
      paddingTop:    'max(8px,  env(safe-area-inset-top))',
      paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
      paddingLeft:   'max(10px, env(safe-area-inset-left))',
      paddingRight:  'max(10px, env(safe-area-inset-right))',
      gap: isLandscape ? 5 : 7,
      background: '#08090D',
      fontFamily: MONO,
    }}>

      {/* ── status bar ── one compact line ────────────────────────────────── */}
      <div style={{ flexShrink:0, display:'flex', alignItems:'center', justifyContent:'space-between', height: isLandscape ? 26 : 30 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:10, letterSpacing:'0.13em', color:'rgba(169,180,208,0.45)' }}>SESSION</span>
          <span style={{ fontSize:14, letterSpacing:'0.18em', fontWeight:700, color:'#EAF0FF' }}>
            {session || '——'}
          </span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:7 }}>
          {errorLine && (
            <span style={{ fontSize:9, color:'rgba(169,180,208,0.38)', letterSpacing:'0.04em', maxWidth:140, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {errorLine}
            </span>
          )}
          <div style={{ width:6, height:6, borderRadius:'50%', background:sc, boxShadow:`0 0 7px ${sc}` }} />
          <span style={{ fontSize:10, letterSpacing:'0.13em', color:sc }}>{statusLabel}</span>
        </div>
      </div>

      {/* ── main control area ─────────────────────────────────────────────── */}
      {isLandscape ? (
        /* landscape: stick ── buttons ── stick */
        <div style={{ flex:1, minHeight:0, display:'grid', gridTemplateColumns:'auto 1fr auto', gap:8, alignItems:'center' }}>
          {moveStick}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:5, alignContent:'center' }}>
            {btns}
          </div>
          {aimStick}
        </div>
      ) : (
        /* portrait: sticks row ── buttons row */
        <>
          <div style={{ flex:1, minHeight:0, display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, alignItems:'center', justifyItems:'center' }}>
            {moveStick}
            {aimStick}
          </div>
          <div style={{ flexShrink:0, display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:5 }}>
            {btns}
          </div>
        </>
      )}

    </main>
  );
}
