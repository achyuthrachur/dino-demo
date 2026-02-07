'use client';

import { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { animate } from 'animejs';
import { CAMERA, DURATION_MS, EASING } from '../_lib/motion';
import { useStore } from '../_lib/store';

export function CameraRig() {
  const { camera } = useThree();
  const transitionPhase = useStore((s) => s.transitionPhase);

  // Store the base camera position from first render
  const basePos = useRef<{ z: number; y: number } | null>(null);
  // Anime.js tween target
  const dollyTarget = useRef({ z: 0, y: 0 });

  useEffect(() => {
    // Capture the initial camera position as base on first mount
    if (!basePos.current) {
      basePos.current = { z: camera.position.z, y: camera.position.y };
    }
  }, [camera]);

  useEffect(() => {
    if (transitionPhase === 'idle') return;

    const toSkin = transitionPhase === 'toSkin';
    const target = dollyTarget.current;

    animate(target, {
      z: toSkin ? -CAMERA.dollyZDelta : 0,
      y: toSkin ? CAMERA.dollyYDelta : 0,
      duration: DURATION_MS.cameraDolly,
      ease: EASING.animeCinematic,
    });
  }, [transitionPhase]);

  useFrame(() => {
    if (!basePos.current) return;
    const target = dollyTarget.current;

    // Apply dolly offset with damping
    const goalZ = basePos.current.z + target.z;
    const goalY = basePos.current.y + target.y;

    camera.position.z += (goalZ - camera.position.z) * CAMERA.damp;
    camera.position.y += (goalY - camera.position.y) * CAMERA.damp;
  });

  return null;
}
