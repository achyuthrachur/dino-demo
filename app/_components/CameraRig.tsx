'use client';

import { useRef, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { animate } from 'animejs';
import { CAMERA, DURATION_MS, EASING } from '../_lib/motion';
import { useStore } from '../_lib/store';

export function CameraRig() {
  const { camera } = useThree();
  const transitionPhase = useStore((s) => s.transitionPhase);
  const basePos = useRef<{ z: number; y: number } | null>(null);

  useEffect(() => {
    if (!basePos.current) {
      basePos.current = { z: camera.position.z, y: camera.position.y };
    }
  }, [camera]);

  // Animate camera position directly on transition — no per-frame fighting with OrbitControls
  useEffect(() => {
    if (transitionPhase === 'idle' || !basePos.current) return;

    const toSkin = transitionPhase === 'toSkin';
    const target = {
      z: camera.position.z,
      y: camera.position.y,
    };
    const goalZ = basePos.current.z + (toSkin ? -CAMERA.dollyZDelta : 0);
    const goalY = basePos.current.y + (toSkin ? CAMERA.dollyYDelta : 0);

    animate(target, {
      z: goalZ,
      y: goalY,
      duration: DURATION_MS.cameraDolly,
      ease: EASING.animeCinematic,
      onUpdate: () => {
        camera.position.z = target.z;
        camera.position.y = target.y;
      },
    });
  }, [transitionPhase, camera]);

  return null;
}
