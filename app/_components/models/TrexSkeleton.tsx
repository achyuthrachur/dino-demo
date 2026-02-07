'use client';

import { useRef, useEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
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

  const clonedScene = useMemo(() => scene.clone() as THREE.Group, [scene]);

  const centerOffset = useMemo(() => {
    const box = new THREE.Box3().setFromObject(clonedScene);
    const center = box.getCenter(new THREE.Vector3());
    return [-center.x, -center.y, -center.z] as [number, number, number];
  }, [clonedScene]);

  useEffect(() => {
    ensureTransparent(clonedScene);
    setSceneReady(true);
  }, [clonedScene, setSceneReady]);

  useFrame(() => {
    setSceneOpacity(clonedScene, opacity.current);
  });

  const xform = MODEL_XFORM.skeleton;
  const finalPosition: [number, number, number] = [
    centerOffset[0] + xform.position[0],
    centerOffset[1] + xform.position[1],
    centerOffset[2] + xform.position[2],
  ];

  return (
    <group ref={groupRef} position={finalPosition} rotation={xform.rotation} scale={xform.scale}>
      <primitive object={clonedScene} />
    </group>
  );
}
