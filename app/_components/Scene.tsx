'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, Center, Bounds, useBounds } from '@react-three/drei';
import { useRef, useEffect, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import { CAMERA } from '../_lib/motion';
import { useStore } from '../_lib/store';
import * as THREE from 'three';

function FitCamera() {
  const bounds = useBounds();
  useEffect(() => {
    bounds.refresh().clip().fit();
  }, [bounds]);
  return null;
}

function TRexModel() {
  const groupRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF('/models/trex_skeleton.glb');
  const setSceneReady = useStore((s) => s.setSceneReady);

  useEffect(() => {
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
      <Center>
        <primitive object={scene.clone()} />
      </Center>
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
      camera={{ position: [6, 2, 6], fov: 45 }}
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

      {/* Model with Suspense + auto-framing */}
      <Suspense fallback={<LoadingFallback />}>
        <Bounds fit clip observe={false} margin={1.5}>
          <FitCamera />
          <TRexModel />
        </Bounds>
      </Suspense>

      {/* Controls */}
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.6}
        zoomSpeed={0.8}
        panSpeed={0.6}
        minDistance={2}
        maxDistance={30}
      />
    </Canvas>
  );
}
