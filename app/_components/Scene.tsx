'use client';

import { useRef, useEffect } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Suspense } from 'react';
import * as THREE from 'three';
import { TrexScene } from './TrexScene';
import { CameraRig } from './CameraRig';
import { useStore } from '../_lib/store';

const DARK_BG = new THREE.Color('#07090D');
const LIGHT_BG = new THREE.Color('#F5F5F0');

function SceneBackground() {
  const { scene } = useThree();
  const mode = useStore((s) => s.mode);
  const targetColor = useRef(new THREE.Color('#07090D'));

  useEffect(() => {
    if (!scene.background) {
      scene.background = new THREE.Color('#07090D');
    }
    targetColor.current.copy(mode === 'skin' ? LIGHT_BG : DARK_BG);
  }, [mode, scene]);

  useFrame(() => {
    if (scene.background instanceof THREE.Color) {
      scene.background.lerp(targetColor.current, 0.06);
    }
  });

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
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
      }}
    >
      {/* Background color — dark for skeleton, light for skin */}
      <SceneBackground />

      {/* Lighting */}
      <ambientLight intensity={0.7} />
      <directionalLight intensity={1.1} position={[3, 6, 4]} />
      <directionalLight intensity={0.6} position={[-4, 2, -3]} />

      {/* Models */}
      <Suspense fallback={<LoadingFallback />}>
        <TrexScene />
      </Suspense>

      {/* Camera dolly rig */}
      <CameraRig />

      {/* Controls */}
      <OrbitControls
        makeDefault
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
