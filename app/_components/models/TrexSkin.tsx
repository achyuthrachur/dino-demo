'use client';

import { useRef, useEffect, useMemo } from 'react';
import { useGLTF, useAnimations, Center } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { MODEL_XFORM } from '../../_lib/models';
import { ensureTransparent, setSceneOpacity } from '../../_lib/three/materials';
import { pickClips } from '../../_lib/clips';
import { useStore } from '../../_lib/store';

interface Props {
  opacity: React.MutableRefObject<number>;
}

export function TrexSkin({ opacity }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF('/models/trex_skin.glb');
  const { actions, mixer } = useAnimations(animations, groupRef);
  const setSkinReady = useStore((s) => s.setSkinReady);
  const setHasRoarClip = useStore((s) => s.setHasRoarClip);
  const roarRequested = useStore((s) => s.roarRequested);
  const clearRoarRequest = useStore((s) => s.clearRoarRequest);
  const mode = useStore((s) => s.mode);
  const isPlayingRoar = useRef(false);

  const clipMap = useMemo(() => {
    const names = animations.map((a) => a.name);
    console.log(`[TrexSkin] ${animations.length} clips:`, names);
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
  }, [scene, clipMap, setHasRoarClip, setSkinReady]);

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

  // Apply opacity per frame
  useFrame(() => {
    setSceneOpacity(scene, opacity.current);
  });

  const xform = MODEL_XFORM.skin;

  return (
    <group position={xform.position}>
      <group ref={groupRef} rotation={xform.rotation} scale={xform.scale}>
        <Center>
          <primitive object={scene} />
        </Center>
      </group>
    </group>
  );
}
