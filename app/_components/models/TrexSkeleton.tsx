'use client';

import { useRef, useEffect } from 'react';
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
  const clonedScene = useRef<THREE.Group | null>(null);

  useEffect(() => {
    clonedScene.current = scene.clone() as THREE.Group;
    ensureTransparent(clonedScene.current);
    setSceneReady(true);
  }, [scene, setSceneReady]);

  useFrame(() => {
    if (clonedScene.current) {
      setSceneOpacity(clonedScene.current, opacity.current);
    }
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
        {clonedScene.current && <primitive object={clonedScene.current} />}
      </Center>
    </group>
  );
}
