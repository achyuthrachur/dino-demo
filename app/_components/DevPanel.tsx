'use client';

import { useEffect, useState, useCallback } from 'react';
import { useDirector } from '../_lib/director';
import { CHAPTERS } from '../_lib/tour';
import { SEGMENT_BONES } from '../_lib/explodePresets';

export function DevPanel() {
  const phase = useDirector((s) => s.phase);
  const activeChapter = useDirector((s) => s.activeChapter);
  const explodeProgress = useDirector((s) => s.explodeProgress);
  const setExplodeProgress = useDirector((s) => s.setExplodeProgress);
  const _cameraRef = useDirector((s) => s._cameraRef);
  const _controlsRef = useDirector((s) => s._controlsRef);

  const [cameraStr, setCameraStr] = useState('');
  const [boneNames, setBoneNames] = useState<string[]>([]);

  // Update camera readout periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (!_cameraRef || !_controlsRef) return;
      const p = _cameraRef.position;
      const t = _controlsRef.target;
      setCameraStr(
        `pos: [${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)}]\n` +
          `tgt: [${t.x.toFixed(1)}, ${t.y.toFixed(1)}, ${t.z.toFixed(1)}]`,
      );
    }, 200);
    return () => clearInterval(interval);
  }, [_cameraRef, _controlsRef]);

  const copyCameraToClipboard = useCallback(() => {
    if (!_cameraRef || !_controlsRef) return;
    const p = _cameraRef.position;
    const t = _controlsRef.target;
    const text = `cameraPos: [${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)}],\ncameraTarget: [${t.x.toFixed(1)}, ${t.y.toFixed(1)}, ${t.z.toFixed(1)}],`;
    navigator.clipboard.writeText(text);
    console.log('[DevPanel] Copied camera pose:\n' + text);
  }, [_cameraRef, _controlsRef]);

  const logBones = useCallback(() => {
    const { _skeletonScene: root } = useDirector.getState();

    if (!root) {
      console.warn('[DevPanel] Skeleton scene not loaded yet');
      return;
    }

    // Strategy 1: type/isBone check
    const boneTyped: string[] = [];
    // Strategy 2: name-based — match against SEGMENT_BONES values
    const targetNames = new Set(Object.values(SEGMENT_BONES));
    const nameMatched: string[] = [];
    // Diagnostic: all named nodes
    const allNamed: string[] = [];

    root.traverse((child: { type?: string; name?: string; isBone?: boolean }) => {
      if (child.name) {
        allNamed.push(`${child.name} [type=${child.type}, isBone=${!!child.isBone}]`);
      }
      if ((child.type === 'Bone' || child.isBone) && child.name) {
        boneTyped.push(child.name);
      }
      if (child.name && targetNames.has(child.name)) {
        nameMatched.push(child.name);
      }
    });

    console.log(`[DevPanel] Bone-typed nodes (${boneTyped.length}):`, boneTyped);
    console.log(`[DevPanel] Name-matched segment bones (${nameMatched.length}/${targetNames.size}):`, nameMatched);
    console.log(`[DevPanel] All named nodes (${allNamed.length}):`, allNamed);

    // Use bone-typed if found, otherwise fall back to name-matched, otherwise show all
    const result = boneTyped.length > 0 ? boneTyped : nameMatched.length > 0 ? nameMatched : allNamed;
    setBoneNames(result);
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        left: '0.75rem',
        top: '0.75rem',
        zIndex: 50,
        maxWidth: '18rem',
        maxHeight: '90vh',
        overflowY: 'auto',
        fontSize: '0.7rem',
        fontFamily: 'monospace',
        color: 'var(--fg1)',
      }}
      className="glass-panel"
    >
      <h3 style={{ color: 'var(--accent)', marginBottom: '0.5rem', fontSize: '0.75rem' }}>
        Dev Panel
      </h3>

      {/* Director state */}
      <div style={{ marginBottom: '0.5rem' }}>
        <div>phase: {phase}</div>
        <div>chapter: {activeChapter} ({CHAPTERS[activeChapter]?.title ?? 'home'})</div>
        <div>explode: {explodeProgress.toFixed(3)}</div>
      </div>

      {/* Camera readout */}
      <div style={{ marginBottom: '0.5rem' }}>
        <div style={{ color: 'var(--fg0)', fontWeight: 600 }}>Camera:</div>
        <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{cameraStr || 'N/A'}</pre>
        <button onClick={copyCameraToClipboard} style={devBtnStyle}>
          Copy Pose
        </button>
      </div>

      {/* Explode slider */}
      <div style={{ marginBottom: '0.5rem' }}>
        <div style={{ color: 'var(--fg0)', fontWeight: 600 }}>Explode Scrub:</div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={explodeProgress}
          onChange={(e) => setExplodeProgress(parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      {/* Bone inspector */}
      <div>
        <button onClick={logBones} style={devBtnStyle}>
          Log All Bones
        </button>
        {boneNames.length > 0 && (
          <div
            style={{
              marginTop: '0.25rem',
              maxHeight: '12rem',
              overflowY: 'auto',
              fontSize: '0.6rem',
            }}
          >
            {boneNames.map((name, i) => (
              <div key={i}>{name}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const devBtnStyle: React.CSSProperties = {
  padding: '0.2rem 0.5rem',
  marginTop: '0.25rem',
  background: 'rgba(124, 247, 198, 0.15)',
  color: 'var(--accent)',
  border: '1px solid rgba(124, 247, 198, 0.3)',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '0.65rem',
  fontFamily: 'monospace',
};
