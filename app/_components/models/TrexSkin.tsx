'use client';

import { useRef, useEffect, useMemo } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { MODEL_XFORM } from '../../_lib/models';
import { ensureTransparent, setSceneOpacity } from '../../_lib/three/materials';
import { pickClips } from '../../_lib/clips';
import { useStore } from '../../_lib/store';

interface Props {
  opacity: React.MutableRefObject<number>;
  onSceneLoaded?: (scene: THREE.Object3D) => void;
}

export function TrexSkin({ opacity, onSceneLoaded }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF('/models/trex_skin.glb');
  const { actions, mixer } = useAnimations(animations, groupRef);
  const setSkinReady = useStore((s) => s.setSkinReady);
  const setHasRoarClip = useStore((s) => s.setHasRoarClip);
  const roarRequested = useStore((s) => s.roarRequested);
  const clearRoarRequest = useStore((s) => s.clearRoarRequest);
  const mode = useStore((s) => s.mode);
  const isPlayingRoar = useRef(false);
  const roarAudio = useRef<HTMLAudioElement | null>(null);

  // Lazily create audio element (client-only)
  useEffect(() => {
    roarAudio.current = new Audio('/audio/trex-roar.m4a');
    roarAudio.current.volume = 0.6;
  }, []);

  const clipMap = useMemo(() => {
    const names = animations.map((a) => a.name);
    return pickClips(names);
  }, [animations]);

  // On mount: stop all animations immediately
  useEffect(() => {
    mixer.stopAllAction();
  }, [mixer]);

  // Signal readiness and clip availability
  useEffect(() => {
    ensureTransparent(scene);
    setHasRoarClip(!!clipMap.roar);
    setSkinReady(true);
    onSceneLoaded?.(scene);
  }, [scene, clipMap, setHasRoarClip, setSkinReady, onSceneLoaded]);

  // Stop all actions helper
  const stopAll = () => {
    Object.values(actions).forEach((action) => {
      if (action) {
        action.stop();
      }
    });
    isPlayingRoar.current = false;
  };

  // Idle animation — only when in skin mode
  useEffect(() => {
    if (mode !== 'skin') {
      stopAll();
      return;
    }

    if (!clipMap.idle || !actions[clipMap.idle]) return;
    const idleAction = actions[clipMap.idle]!;
    idleAction.reset().fadeIn(0.3).play();

    return () => {
      idleAction.fadeOut(0.3);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, clipMap.idle, actions]);

  // Roar one-shot — only on explicit button press
  useEffect(() => {
    if (!roarRequested) return;

    clearRoarRequest();

    if (!clipMap.roar || !actions[clipMap.roar] || mode !== 'skin') return;

    const roarAction = actions[clipMap.roar]!;
    const idleAction = clipMap.idle ? actions[clipMap.idle] : null;

    isPlayingRoar.current = true;

    // Play roar sound effect
    if (roarAudio.current) {
      roarAudio.current.currentTime = 0;
      roarAudio.current.play().catch(() => {});
    }

    if (idleAction) idleAction.fadeOut(0.3);

    roarAction.reset();
    roarAction.setLoop(THREE.LoopOnce, 1);
    roarAction.clampWhenFinished = true;
    roarAction.fadeIn(0.3).play();

    const onFinished = (e: { action: THREE.AnimationAction }) => {
      if (e.action === roarAction) {
        isPlayingRoar.current = false;
        roarAction.fadeOut(0.3);
        if (idleAction && mode === 'skin') {
          idleAction.reset().fadeIn(0.3).play();
        }
        mixer.removeEventListener('finished', onFinished);
      }
    };

    mixer.addEventListener('finished', onFinished);
    return () => {
      mixer.removeEventListener('finished', onFinished);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roarRequested]);

  const centerOffset = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const center = box.getCenter(new THREE.Vector3());
    const corr = MODEL_XFORM.skin.centerCorrection ?? [0, 0, 0];
    return [
      -center.x + corr[0],
      -center.y + corr[1],
      -center.z + corr[2],
    ] as [number, number, number];
  }, [scene]);

  // Apply opacity per frame
  useFrame(() => {
    setSceneOpacity(scene, opacity.current);
  });

  const xform = MODEL_XFORM.skin;

  return (
    <group position={xform.position} rotation={xform.rotation} scale={xform.scale}>
      <group ref={groupRef} position={centerOffset}>
        <primitive object={scene} />
      </group>
    </group>
  );
}
