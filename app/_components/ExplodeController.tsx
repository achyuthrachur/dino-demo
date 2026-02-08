'use client';

import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useDirector } from '../_lib/director';
import { initExplodeState, applyExplode, resetExplode } from '../_lib/three/explode';
import type { ExplodeState } from '../_lib/three/explode';

interface Props {
  skeletonScene: THREE.Object3D | null;
}

export function ExplodeController({ skeletonScene }: Props) {
  const explodeState = useRef<ExplodeState | null>(null);

  // Initialize explode state when skeleton scene becomes available
  useEffect(() => {
    if (!skeletonScene) {
      explodeState.current = null;
      return;
    }

    explodeState.current = initExplodeState(skeletonScene);

    return () => {
      if (explodeState.current) {
        resetExplode(explodeState.current);
        explodeState.current = null;
      }
    };
  }, [skeletonScene]);

  // Apply explode offsets every frame based on director state
  useFrame(() => {
    if (!explodeState.current?.ready) return;

    const { explodeProgress, segmentWeights, phase } = useDirector.getState();

    // Only apply when touring or busy (animating)
    if (phase === 'home' && explodeProgress <= 0.001) {
      return;
    }

    applyExplode(explodeState.current, explodeProgress, segmentWeights);
  });

  return null;
}
