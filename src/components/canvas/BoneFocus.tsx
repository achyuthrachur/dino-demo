'use client';

// =============================================================================
// BoneFocus.tsx - Claw Mechanics Interaction Component
// =============================================================================

import { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line, Html } from '@react-three/drei';
import * as THREE from 'three';
import type { BoneMetadata } from '@/lib/types';
import { useExhibitStore } from '@/lib/store';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface BoneFocusProps {
  bone: BoneMetadata;
  accentColor: string;
}

// -----------------------------------------------------------------------------
// Annotation Line Component
// -----------------------------------------------------------------------------

function AnnotationLine({
  start,
  end,
  color,
}: {
  start: THREE.Vector3;
  end: THREE.Vector3;
  color: string;
}) {
  const points = useMemo(() => [start, end], [start, end]);

  return (
    <Line
      points={points}
      color={color}
      lineWidth={2}
      dashed={false}
    />
  );
}

// -----------------------------------------------------------------------------
// Focus Ring Component
// -----------------------------------------------------------------------------

function FocusRing({ position, color }: { position: THREE.Vector3; color: string }) {
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!ringRef.current) return;

    // Pulsing animation
    const scale = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.1;
    ringRef.current.scale.setScalar(scale);

    // Slow rotation
    ringRef.current.rotation.z = state.clock.elapsedTime * 0.5;
  });

  return (
    <mesh ref={ringRef} position={position}>
      <ringGeometry args={[0.15, 0.2, 32]} />
      <meshBasicMaterial color={color} transparent opacity={0.6} side={THREE.DoubleSide} />
    </mesh>
  );
}

// -----------------------------------------------------------------------------
// Focused Bone Detail Panel
// -----------------------------------------------------------------------------

function FocusDetailPanel({
  bone,
  accentColor,
  onClose,
}: {
  bone: BoneMetadata;
  accentColor: string;
  onClose: () => void;
}) {
  const confidenceLabels = {
    certain: 'Confirmed',
    likely: 'Probable',
    debated: 'Under Study',
  };

  const confidenceColors = {
    certain: '#6b8f71',
    likely: '#c9a962',
    debated: '#b07070',
  };

  return (
    <Html
      position={bone.anchor}
      center
      distanceFactor={6}
      style={{
        pointerEvents: 'auto',
      }}
    >
      <div className="glass-strong rounded-xl p-4 w-64 animate-in fade-in zoom-in duration-300">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-display text-lg font-bold" style={{ color: accentColor }}>
              {bone.label}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: confidenceColors[bone.confidence] }}
              />
              <span className="font-mono text-xs text-muted-foreground">
                {confidenceLabels[bone.confidence]}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        {/* Description */}
        <p className="font-body text-sm text-muted-foreground leading-relaxed">
          {bone.description}
        </p>

        {/* Mesh name (technical info) */}
        <div className="mt-3 pt-3 border-t border-border">
          <span className="font-mono text-xs text-muted-foreground">
            Mesh: {bone.meshName}
          </span>
        </div>
      </div>
    </Html>
  );
}

// -----------------------------------------------------------------------------
// Main Bone Focus Export
// -----------------------------------------------------------------------------

export function BoneFocus({ bone, accentColor }: BoneFocusProps) {
  const isBoneFocusActive = useExhibitStore((state) => state.isBoneFocusActive);
  const focusedBoneName = useExhibitStore((state) => state.focusedBoneName);
  const clearBoneFocus = useExhibitStore((state) => state.clearBoneFocus);

  const isThisBoneFocused = isBoneFocusActive && focusedBoneName === bone.meshName;

  if (!isThisBoneFocused) return null;

  // Calculate annotation line positions
  const bonePosition = new THREE.Vector3(...bone.anchor);
  const labelOffset = new THREE.Vector3(0, 0.5, 0);
  const labelPosition = bonePosition.clone().add(labelOffset);

  return (
    <group>
      {/* Focus ring at bone position */}
      <FocusRing position={bonePosition} color={accentColor} />

      {/* Annotation line */}
      <AnnotationLine
        start={bonePosition}
        end={labelPosition}
        color={accentColor}
      />

      {/* Detail panel */}
      <FocusDetailPanel
        bone={bone}
        accentColor={accentColor}
        onClose={clearBoneFocus}
      />
    </group>
  );
}

// -----------------------------------------------------------------------------
// Bone Focus Overlay (shows when any bone is focused)
// -----------------------------------------------------------------------------

export function BoneFocusOverlay() {
  const isBoneFocusActive = useExhibitStore((state) => state.isBoneFocusActive);
  const clearBoneFocus = useExhibitStore((state) => state.clearBoneFocus);

  useEffect(() => {
    // ESC key to clear focus
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isBoneFocusActive) {
        clearBoneFocus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isBoneFocusActive, clearBoneFocus]);

  if (!isBoneFocusActive) return null;

  return (
    <div
      className="fixed inset-0 z-40 pointer-events-none"
      style={{
        background: 'radial-gradient(circle at center, transparent 30%, rgba(0,0,0,0.4) 100%)',
      }}
    />
  );
}
