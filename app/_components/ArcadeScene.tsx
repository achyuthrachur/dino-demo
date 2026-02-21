'use client';

import { Suspense, useEffect, useRef, type MutableRefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import * as THREE from 'three';
import { TrexScene } from './TrexScene';
import { ARCADE_CONFIG, applyDeadzone, type JoyVector } from '../_lib/arcade/config';
import { useDirector } from '../_lib/director';

interface ArcadeRigProps {
  joyRef: MutableRefObject<JoyVector>;
  resetToken: number;
}

interface ArcadeSceneProps {
  joyRef: MutableRefObject<JoyVector>;
  resetToken: number;
}

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

function ArcadeRig({ joyRef, resetToken }: ArcadeRigProps) {
  const groupRef = useRef<THREE.Group>(null);
  const smoothXRef = useRef(0);
  const smoothYRef = useRef(0);

  useEffect(() => {
    smoothXRef.current = 0;
    smoothYRef.current = 0;
    if (groupRef.current) {
      groupRef.current.position.y = 0;
      groupRef.current.rotation.y = 0;
    }
  }, [resetToken]);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;

    const targetX = applyDeadzone(joyRef.current.x, ARCADE_CONFIG.deadzone);
    const targetY = applyDeadzone(joyRef.current.y, ARCADE_CONFIG.deadzone);
    const alpha = 1 - Math.exp(-ARCADE_CONFIG.smoothingPerSecond * delta);

    smoothXRef.current += (targetX - smoothXRef.current) * alpha;
    smoothYRef.current += (targetY - smoothYRef.current) * alpha;

    group.rotation.y = smoothXRef.current * ARCADE_CONFIG.maxYawRadians;
    group.position.y = smoothYRef.current * ARCADE_CONFIG.maxLiftMeters;
  });

  return (
    <group ref={groupRef}>
      <TrexScene />
    </group>
  );
}

export function ArcadeScene({ joyRef, resetToken }: ArcadeSceneProps) {
  useEffect(() => {
    // Ensure we are not mid-tour if the presenter navigates from the exhibit route.
    useDirector.getState().setPhase('home');
  }, []);

  return (
    <Canvas
      camera={{ position: [13, 4, 18], fov: 45 }}
      gl={{ antialias: true, powerPreference: 'high-performance', localClippingEnabled: true }}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
      }}
    >
      <SceneBackground />
      <Environment preset="studio" environmentIntensity={0.45} />

      <ambientLight intensity={0.75} />
      <directionalLight intensity={1.15} position={[4, 7, 5]} />
      <directionalLight intensity={0.55} position={[-5, 2, -4]} />
      <pointLight color="#7CF7C6" intensity={8} position={[-6, 4, -8]} distance={30} decay={2} />
      <pointLight color="#5AD4FF" intensity={5} position={[6, 2, -10]} distance={30} decay={2} />

      <Suspense fallback={<LoadingFallback />}>
        <ArcadeRig joyRef={joyRef} resetToken={resetToken} />
      </Suspense>
    </Canvas>
  );
}
