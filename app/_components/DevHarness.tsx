'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { MODEL_XFORM, type ModelTransform } from '../_lib/models';

type SelectedModel = 'skeleton' | 'skin';

export function DevHarness() {
  const [selected, setSelected] = useState<SelectedModel>('skeleton');
  const transforms = useRef<Record<SelectedModel, ModelTransform>>({
    skeleton: { ...MODEL_XFORM.skeleton },
    skin: { ...MODEL_XFORM.skin },
  });
  const [, forceRender] = useState(0);

  const nudge = useCallback(
    (axis: 'position' | 'rotation' | 'scale', index: number, delta: number) => {
      const t = transforms.current[selected];
      if (axis === 'scale') {
        t.scale += delta;
      } else {
        t[axis][index] += delta;
      }
      forceRender((n) => n + 1);
    },
    [selected]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const TRANSLATE_STEP = 0.5;
      const ROTATE_STEP = 0.02;
      const SCALE_STEP = 0.01;

      switch (e.key) {
        // Select model
        case '1': setSelected('skeleton'); break;
        case '2': setSelected('skin'); break;
        // Translate
        case 'w': nudge('position', 2, -TRANSLATE_STEP); break;
        case 's': nudge('position', 2, TRANSLATE_STEP); break;
        case 'a': nudge('position', 0, -TRANSLATE_STEP); break;
        case 'd': nudge('position', 0, TRANSLATE_STEP); break;
        case 'q': nudge('position', 1, -TRANSLATE_STEP); break;
        case 'e': nudge('position', 1, TRANSLATE_STEP); break;
        // Rotate
        case 'i': nudge('rotation', 0, ROTATE_STEP); break;
        case 'k': nudge('rotation', 0, -ROTATE_STEP); break;
        case 'j': nudge('rotation', 1, -ROTATE_STEP); break;
        case 'l': nudge('rotation', 1, ROTATE_STEP); break;
        // Scale
        case '-': nudge('scale', 0, -SCALE_STEP); break;
        case '=': nudge('scale', 0, SCALE_STEP); break;
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [nudge]);

  const copyTransforms = () => {
    const snippet = JSON.stringify(transforms.current, null, 2);
    console.log('[DevHarness] MODEL_XFORM =', snippet);
    navigator.clipboard?.writeText(snippet);
  };

  const fmt = (arr: [number, number, number]) =>
    arr.map((v) => v.toFixed(3)).join(', ');

  const t = transforms.current[selected];

  return (
    <div
      style={{
        position: 'fixed',
        top: '1rem',
        right: '1rem',
        zIndex: 50,
        background: 'rgba(10, 14, 28, 0.85)',
        backdropFilter: 'blur(8px)',
        borderRadius: '12px',
        border: '1px solid rgba(124, 247, 198, 0.2)',
        padding: '1rem',
        fontFamily: 'monospace',
        fontSize: '0.75rem',
        color: 'var(--fg0)',
        maxWidth: '320px',
      }}
    >
      <div style={{ marginBottom: '0.5rem', color: 'var(--accent)', fontWeight: 700 }}>
        DEV HARNESS
      </div>

      <div style={{ marginBottom: '0.5rem' }}>
        <span
          onClick={() => setSelected('skeleton')}
          style={{
            cursor: 'pointer',
            padding: '2px 6px',
            borderRadius: '4px',
            background: selected === 'skeleton' ? 'var(--accent)' : 'transparent',
            color: selected === 'skeleton' ? 'var(--bg0)' : 'var(--fg1)',
            marginRight: '0.5rem',
          }}
        >
          [1] Skeleton
        </span>
        <span
          onClick={() => setSelected('skin')}
          style={{
            cursor: 'pointer',
            padding: '2px 6px',
            borderRadius: '4px',
            background: selected === 'skin' ? 'var(--accent)' : 'transparent',
            color: selected === 'skin' ? 'var(--bg0)' : 'var(--fg1)',
          }}
        >
          [2] Skin
        </span>
      </div>

      <div style={{ color: 'var(--fg1)', lineHeight: 1.6 }}>
        <div>pos: [{fmt(t.position)}]</div>
        <div>rot: [{fmt(t.rotation)}]</div>
        <div>scl: {t.scale.toFixed(3)}</div>
      </div>

      <div style={{ marginTop: '0.5rem', color: 'var(--fg1)', fontSize: '0.65rem' }}>
        WASD/QE = translate | IJKL = rotate | -/= = scale
      </div>

      <button
        onClick={copyTransforms}
        style={{
          marginTop: '0.5rem',
          padding: '4px 8px',
          background: 'rgba(124, 247, 198, 0.15)',
          color: 'var(--accent)',
          border: '1px solid rgba(124, 247, 198, 0.3)',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '0.7rem',
          fontFamily: 'monospace',
        }}
      >
        Copy transforms
      </button>
    </div>
  );
}
