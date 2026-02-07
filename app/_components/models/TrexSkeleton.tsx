'use client';

import { useRef, useEffect, useMemo } from 'react';
import { useGLTF, Center } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { MODEL_XFORM } from '../../_lib/models';
import { ensureTransparent, setSceneOpacity } from '../../_lib/three/materials';
import { useStore } from '../../_lib/store';

interface Props {
  opacity: React.MutableRefObject<number>;
}

export function TrexSkeleton({ opacity }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF('/models/trex_skeleton.glb');
  const setSceneReady = useStore((s) => s.setSceneReady);

  // Clone immediately during render (not in useEffect) so it's available on first paint
  const clonedScene = useMemo(() => scene.clone() as THREE.Group, [scene]);

  useEffect(() => {
    ensureTransparent(clonedScene);
    setSceneReady(true);
  }, [clonedScene, setSceneReady]);

  useFrame(() => {
    setSceneOpacity(clonedScene, opacity.current);
  });

  const xform = MODEL_XFORM.skeleton;

  return (
    <group
      ref={groupRef}
      position={xform.position}
      rotation={xform.rotation}
      scale={xform.scale}
    >
      <Center>
        <primitive object={clonedScene} />
      </Center>
    </group>
  );
}
