'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import { useRef, useEffect, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import { CAMERA } from '../_lib/motion';
import { useStore } from '../_lib/store';
import * as THREE from 'three';

function TRexModel() {
  const groupRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF('/models/trex_skeleton.glb');
  const setSceneReady = useStore((s) => s.setSceneReady);

  useEffect(() => {
    if (groupRef.current) {
      // Center the model based on its bounding box
      const box = new THREE.Box3().setFromObject(groupRef.current);
      const center = box.getCenter(new THREE.Vector3());
      groupRef.current.position.sub(center);

      // Scale if model is too large or too small
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      if (maxDim > 6) {
        const scale = 5 / maxDim;
        groupRef.current.scale.setScalar(scale);
      }
    }
    setSceneReady(true);
  }, [setSceneReady]);

  // Idle revolve (frame-rate independent)
  useFrame((_state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += CAMERA.idleRevolveRadPerSec * delta;
    }
  });

  return (
    <group ref={groupRef}>
      <primitive object={scene.clone()} />
    </group>
  );
}

function LoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[0.5, 0.5, 0.5]} />
      <meshStandardMaterial color="#7CF7C6" wireframe />
    </mesh>
  );
}

export function Scene() {
  return (
    <Canvas
      camera={{ position: [0, 2, 5], fov: 50 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
      }}
    >
      {/* Lighting */}
      <ambientLight intensity={0.7} />
      <directionalLight intensity={1.1} position={[3, 6, 4]} />
      <directionalLight intensity={0.6} position={[-4, 2, -3]} />

      {/* Model with Suspense */}
      <Suspense fallback={<LoadingFallback />}>
        <TRexModel />
      </Suspense>

      {/* Controls */}
      <OrbitControls
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.6}
        zoomSpeed={0.8}
        panSpeed={0.6}
        minDistance={2}
        maxDistance={15}
      />
    </Canvas>
  );
}
