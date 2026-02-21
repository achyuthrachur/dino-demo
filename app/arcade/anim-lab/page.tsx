'use client';

import Link from 'next/link';
import { Canvas, useThree } from '@react-three/fiber';
import { Environment, OrbitControls } from '@react-three/drei';
import { Suspense, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { RexyAnimLabModel } from '@/app/_components/models/RexyAnimLabModel';

function LoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[0.7, 0.7, 0.7]} />
      <meshStandardMaterial color="#7CF7C6" wireframe />
    </mesh>
  );
}

export default function ArcadeAnimLabPage() {
  const [clipNames, setClipNames] = useState<string[]>([]);
  const [selectedClip, setSelectedClip] = useState<string | null>(null);
  const [nowPlaying, setNowPlaying] = useState<string | null>(null);
  const [playNonce, setPlayNonce] = useState(0);
  const [loopEnabled, setLoopEnabled] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [search, setSearch] = useState('');
  const [copyStatus, setCopyStatus] = useState('');
  const [modelRadius, setModelRadius] = useState(6);

  const filteredNames = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clipNames;
    return clipNames.filter((name) => name.toLowerCase().includes(q));
  }, [clipNames, search]);

  const playClip = (clipName: string) => {
    setSelectedClip(clipName);
    setPlayNonce((prev) => prev + 1);
    setNowPlaying(clipName);
  };

  const stopPlayback = () => {
    setSelectedClip(null);
    setNowPlaying(null);
    setPlayNonce((prev) => prev + 1);
  };

  const copyClipName = async (clipName: string) => {
    try {
      await navigator.clipboard.writeText(clipName);
      setCopyStatus(`Copied: ${clipName}`);
      window.setTimeout(() => setCopyStatus(''), 1500);
    } catch {
      setCopyStatus('Copy failed');
      window.setTimeout(() => setCopyStatus(''), 1500);
    }
  };

  return (
    <main style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      <Canvas
        camera={{ position: [0, 2.2, 9], fov: 42, near: 0.01, far: 10000 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        style={{ position: 'fixed', inset: 0 }}
      >
        <color attach="background" args={['#07090D']} />
        <Environment preset="studio" environmentIntensity={0.45} />
        <ambientLight intensity={0.7} />
        <directionalLight intensity={1.2} position={[4, 7, 5]} />
        <directionalLight intensity={0.5} position={[-5, 2, -4]} />
        <pointLight color="#7CF7C6" intensity={6.5} position={[-6, 4, -8]} distance={32} decay={2} />
        <pointLight color="#5AD4FF" intensity={4.5} position={[6, 2, -10]} distance={32} decay={2} />

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.4, 0]} receiveShadow>
          <circleGeometry args={[220, 96]} />
          <meshStandardMaterial color="#0d1325" />
        </mesh>

        <Suspense fallback={<LoadingFallback />}>
          <AutoFitCamera radius={modelRadius} />
          <RexyAnimLabModel
            clipToPlay={selectedClip}
            playNonce={playNonce}
            loopEnabled={loopEnabled}
            playbackSpeed={playbackSpeed}
            onClipNamesChange={setClipNames}
            onNowPlayingChange={setNowPlaying}
            onBoundsRadiusChange={setModelRadius}
          />
        </Suspense>

        <OrbitControls
          makeDefault
          target={[0, 0, 0]}
          enableDamping
          dampingFactor={0.08}
          rotateSpeed={0.65}
          zoomSpeed={0.9}
          minDistance={3}
          maxDistance={1200}
        />
      </Canvas>

      <section
        className="glass-panel"
        style={{
          position: 'fixed',
          top: '1rem',
          left: '1rem',
          width: 'min(560px, calc(100vw - 2rem))',
          maxHeight: 'calc(100vh - 2rem)',
          overflow: 'hidden',
          display: 'grid',
          gap: '0.7rem',
          padding: '1rem',
          zIndex: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
          <h1 style={{ fontSize: '1rem', fontWeight: 800, letterSpacing: '0.05em' }}>
            ANIMATION LAB
          </h1>
          <div style={{ display: 'flex', gap: '0.45rem' }}>
            <Link href="/arcade" style={navLinkStyle}>
              Back To Arcade
            </Link>
            <Link href="/" style={navLinkStyle}>
              Exhibit
            </Link>
          </div>
        </div>

        <div style={{ color: 'var(--fg1)', fontSize: '0.82rem', display: 'grid', gap: '0.28rem' }}>
          <div>
            Now Playing:{' '}
            <strong style={{ color: 'var(--fg0)', wordBreak: 'break-word' }}>{nowPlaying ?? 'None'}</strong>
          </div>
          <div>Clips Loaded: <strong style={{ color: 'var(--fg0)' }}>{clipNames.length}</strong></div>
          <div style={{ color: copyStatus ? 'var(--accent)' : 'var(--fg1)' }}>
            {copyStatus || 'Click any clip to play'}
          </div>
        </div>

        <div style={{ display: 'grid', gap: '0.55rem' }}>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search clip names..."
            style={inputStyle}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.84rem', color: 'var(--fg1)' }}>
              <input
                type="checkbox"
                checked={loopEnabled}
                onChange={(event) => setLoopEnabled(event.target.checked)}
              />
              Loop
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.84rem', color: 'var(--fg1)' }}>
              Speed
              <input
                type="range"
                min={0.25}
                max={1.5}
                step={0.05}
                value={playbackSpeed}
                onChange={(event) => setPlaybackSpeed(Number(event.target.value))}
              />
              <span style={{ color: 'var(--fg0)', minWidth: 42 }}>{playbackSpeed.toFixed(2)}x</span>
            </label>
            <button onClick={stopPlayback} style={stopButtonStyle}>
              Stop
            </button>
          </div>
        </div>

        <div
          style={{
            overflowY: 'auto',
            maxHeight: 'calc(100vh - 275px)',
            display: 'grid',
            gap: '0.45rem',
            paddingRight: '0.2rem',
          }}
        >
          {filteredNames.map((name) => {
            const active = nowPlaying === name || selectedClip === name;
            return (
              <div
                key={name}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  gap: '0.4rem',
                  alignItems: 'center',
                }}
              >
                <button
                  onClick={() => playClip(name)}
                  style={{
                    ...playButtonStyle,
                    borderColor: active ? 'rgba(124,247,198,0.6)' : 'rgba(255,255,255,0.14)',
                    background: active ? 'rgba(124,247,198,0.2)' : 'rgba(255,255,255,0.06)',
                    color: active ? 'var(--accent)' : 'var(--fg0)',
                  }}
                  title={name}
                >
                  {name}
                </button>
                <button onClick={() => copyClipName(name)} style={copyButtonStyle}>
                  Copy
                </button>
              </div>
            );
          })}
          {filteredNames.length === 0 && (
            <div style={{ color: 'var(--fg1)', fontSize: '0.82rem' }}>
              No clip names match this search.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function AutoFitCamera({ radius }: { radius: number }) {
  const { camera, controls } = useThree();

  useEffect(() => {
    const safeRadius = Math.max(0.1, Math.min(radius, 400));
    const distance = Math.max(8, Math.min(safeRadius * 2.8, 900));

    camera.position.set(0, safeRadius * 0.45, distance);
    camera.near = Math.max(0.01, distance / 4000);
    camera.far = Math.max(2200, distance * 16);
    camera.updateProjectionMatrix();

    const orbit = controls as {
      target?: { set: (x: number, y: number, z: number) => void };
      update?: () => void;
    } | null;

    if (orbit?.target) {
      orbit.target.set(0, 0, 0);
      orbit.update?.();
    }
  }, [camera, controls, radius]);

  return null;
}

const navLinkStyle: CSSProperties = {
  border: '1px solid rgba(255,255,255,0.2)',
  background: 'rgba(255,255,255,0.07)',
  color: 'var(--fg0)',
  textDecoration: 'none',
  borderRadius: 8,
  padding: '0.38rem 0.62rem',
  fontSize: '0.77rem',
  fontWeight: 700,
};

const inputStyle: CSSProperties = {
  border: '1px solid rgba(255,255,255,0.2)',
  background: 'rgba(255,255,255,0.07)',
  color: 'var(--fg0)',
  borderRadius: 8,
  fontSize: '0.86rem',
  padding: '0.48rem 0.62rem',
  outline: 'none',
};

const playButtonStyle: CSSProperties = {
  textAlign: 'left',
  border: '1px solid rgba(255,255,255,0.14)',
  background: 'rgba(255,255,255,0.06)',
  color: 'var(--fg0)',
  borderRadius: 8,
  padding: '0.52rem 0.65rem',
  fontSize: '0.8rem',
  lineHeight: 1.35,
  cursor: 'pointer',
  wordBreak: 'break-word',
  whiteSpace: 'normal',
};

const copyButtonStyle: CSSProperties = {
  border: '1px solid rgba(255,255,255,0.2)',
  background: 'rgba(255,255,255,0.05)',
  color: 'var(--fg1)',
  borderRadius: 8,
  padding: '0.42rem 0.56rem',
  fontSize: '0.74rem',
  cursor: 'pointer',
};

const stopButtonStyle: CSSProperties = {
  border: '1px solid rgba(255,122,122,0.4)',
  background: 'rgba(255,122,122,0.14)',
  color: '#FFB0B0',
  borderRadius: 8,
  padding: '0.38rem 0.62rem',
  fontWeight: 700,
  cursor: 'pointer',
};
