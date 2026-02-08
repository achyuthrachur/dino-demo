'use client';

import { useRef, useEffect, useMemo } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { MODEL_XFORM } from '../../_lib/models';
import { ensureTransparent, setSceneOpacity } from '../../_lib/three/materials';
import { useStore } from '../../_lib/store';
import { useDirector } from '../../_lib/director';

interface Props {
  opacity: React.MutableRefObject<number>;
  onSceneLoaded?: (scene: THREE.Object3D) => void;
}

export function TrexSkeleton({ opacity, onSceneLoaded }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF('/models/tyrannosaurus-rex/skeleton-rigged.glb');
  const { actions, mixer } = useAnimations(animations, groupRef);
  const setSceneReady = useStore((s) => s.setSceneReady);
  const setHasWalkClip = useStore((s) => s.setHasWalkClip);
  const walkRequested = useStore((s) => s.walkRequested);
  const clearWalkRequest = useStore((s) => s.clearWalkRequest);
  const mode = useStore((s) => s.mode);
  const directorPhase = useDirector((s) => s.phase);

  const centerOffset = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const center = box.getCenter(new THREE.Vector3());
    return [-center.x, -center.y, -center.z] as [number, number, number];
  }, [scene]);

  // The GLB has a single clip ("Take 01") which is a walk animation.
  // pickClips won't match it by name, so grab the first animation directly.
  const walkClipName = useMemo(() => {
    if (animations.length === 0) return undefined;
    return animations[0].name;
  }, [animations]);

  useEffect(() => {
    mixer.stopAllAction();
  }, [mixer]);

  useEffect(() => {
    ensureTransparent(scene);
    setHasWalkClip(!!walkClipName);
    setSceneReady(true);
    onSceneLoaded?.(scene);
  }, [scene, walkClipName, setHasWalkClip, setSceneReady, onSceneLoaded]);

  // Freeze mixer when touring — prevents walk animation bindings
  // from overwriting bone positions set by ExplodeController
  useEffect(() => {
    if (directorPhase !== 'home') {
      mixer.stopAllAction();
      mixer.timeScale = 0;
    } else {
      mixer.timeScale = 1;
    }
  }, [directorPhase, mixer]);

  // Walk one-shot — only on explicit button press in skeleton mode
  useEffect(() => {
    if (!walkRequested) return;

    clearWalkRequest();

    if (!walkClipName || !actions[walkClipName] || mode !== 'skeleton') return;

    // Block walk when touring — bones are being manipulated by explode
    if (directorPhase !== 'home') return;

    const walkAction = actions[walkClipName]!;

    walkAction.reset();
    walkAction.setLoop(THREE.LoopOnce, 1);
    walkAction.clampWhenFinished = true;
    walkAction.fadeIn(0.3).play();

    const onFinished = (e: { action: THREE.AnimationAction }) => {
      if (e.action === walkAction) {
        walkAction.fadeOut(0.3);
        mixer.removeEventListener('finished', onFinished);
      }
    };

    mixer.addEventListener('finished', onFinished);
    return () => {
      mixer.removeEventListener('finished', onFinished);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walkRequested]);

  useFrame(() => {
    setSceneOpacity(scene, opacity.current);
  });

  const xform = MODEL_XFORM.skeleton;

  return (
    <group position={xform.position} rotation={xform.rotation} scale={xform.scale}>
      <group ref={groupRef} position={centerOffset}>
        <primitive object={scene} />
      </group>
    </group>
  );
}
