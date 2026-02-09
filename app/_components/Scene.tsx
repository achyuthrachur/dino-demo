'use client';

import { useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { Suspense } from 'react';
import * as THREE from 'three';
import { TrexScene } from './TrexScene';
import { CameraRig } from './CameraRig';
import { GestureController } from './GestureController';

function SceneBackground() {
  const { scene } = useThree();

  useEffect(() => {
    scene.background = new THREE.Color('#07090D');
  }, [scene]);

  return null;
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
      camera={{ position: [12, 4, 18], fov: 45 }}
      gl={{ antialias: true, powerPreference: 'high-performance', localClippingEnabled: true }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
      }}
    >
      {/* Background color */}
      <SceneBackground />

      {/* Environment map — subtle reflections on skin */}
      <Environment preset="studio" environmentIntensity={0.4} />

      {/* Lighting */}
      <ambientLight intensity={0.7} />
      <directionalLight intensity={1.1} position={[3, 6, 4]} />
      <directionalLight intensity={0.6} position={[-4, 2, -3]} />

      {/* Rim lights — teal-tinted edge glow from behind */}
      <pointLight color="#7CF7C6" intensity={8} position={[-6, 4, -8]} distance={30} decay={2} />
      <pointLight color="#5AD4FF" intensity={5} position={[6, 2, -10]} distance={30} decay={2} />

      {/* Models */}
      <Suspense fallback={<LoadingFallback />}>
        <TrexScene />
      </Suspense>

      {/* Camera dolly rig */}
      <CameraRig />

      {/* Gesture-based camera control */}
      <GestureController />

      {/* Controls */}
      <OrbitControls
        makeDefault
        target={[2, 2, 0]}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.6}
        zoomSpeed={0.8}
        panSpeed={0.6}
        minDistance={2}
        maxDistance={60}
      />
    </Canvas>
  );
}
