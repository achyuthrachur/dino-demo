'use client';

import { useRef, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { animate } from 'animejs';
import * as THREE from 'three';
import { CAMERA, DURATION_MS, EASING } from '../_lib/motion';
import { useStore } from '../_lib/store';
import { useDirector } from '../_lib/director';

export function CameraRig() {
  const { camera } = useThree();
  const controls = useThree((s) => s.controls) as unknown as {
    target: THREE.Vector3;
    enabled: boolean;
    update: () => void;
  } | null;

  const transitionPhase = useStore((s) => s.transitionPhase);
  const setCameraRefs = useDirector((s) => s.setCameraRefs);
  const basePos = useRef<{ z: number; y: number } | null>(null);

  useEffect(() => {
    if (!basePos.current) {
      basePos.current = { z: camera.position.z, y: camera.position.y };
    }
  }, [camera]);

  // Register camera + controls with director so it can drive chapter animations
  useEffect(() => {
    if (controls) {
      setCameraRefs(camera, controls);
    }
  }, [camera, controls, setCameraRefs]);

  // Mode-switch dolly (existing behavior — only fires on transitionPhase changes)
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
