'use client';

// =============================================================================
// Scene.tsx - Main React Three Fiber Canvas
// =============================================================================

import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, ContactShadows, Grid } from '@react-three/drei';
import { Specimen } from './Specimen';
import { CameraRig } from './CameraRig';
import { ScanEffect } from './ScanEffect';
import { useExhibitStore } from '@/lib/store';
import { getSpecimenById } from '@/lib/registry';

// -----------------------------------------------------------------------------
// Loading Fallback
// -----------------------------------------------------------------------------

function LoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#57534e" wireframe />
    </mesh>
  );
}

// -----------------------------------------------------------------------------
// Scene Lighting
// -----------------------------------------------------------------------------

function SceneLighting() {
  return (
    <>
      {/* Key light - warm amber from front-right */}
      <directionalLight
        position={[5, 8, 5]}
        intensity={1.5}
        color="#fff5e6"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />

      {/* Fill light - cool from left */}
      <directionalLight
        position={[-5, 4, -2]}
        intensity={0.4}
        color="#a8c8e8"
      />

      {/* Rim light - dramatic neon amber backlight */}
      <directionalLight
        position={[0, 3, -8]}
        intensity={0.8}
        color="#f59e0b"
      />

      {/* Ambient for base illumination */}
      <ambientLight intensity={0.15} color="#78716c" />
    </>
  );
}

// -----------------------------------------------------------------------------
// Museum Floor
// -----------------------------------------------------------------------------

function MuseumFloor() {
  return (
    <>
      {/* Contact shadows for grounding */}
      <ContactShadows
        position={[0, -0.01, 0]}
        opacity={0.6}
        scale={20}
        blur={2}
        far={10}
        color="#050505"
      />

      {/* Subtle grid for spatial reference */}
      <Grid
        position={[0, -0.02, 0]}
        args={[30, 30]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#1a1918"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#2a2826"
        fadeDistance={25}
        fadeStrength={1}
        infiniteGrid
      />
    </>
  );
}

// -----------------------------------------------------------------------------
// Scene Content
// -----------------------------------------------------------------------------

function SceneContent() {
  const selectedSpecimenId = useExhibitStore((state) => state.selectedSpecimenId);
  const specimen = selectedSpecimenId ? getSpecimenById(selectedSpecimenId) ?? null : null;

  return (
    <>
      <SceneLighting />
      <MuseumFloor />

      {/* Camera with animated controls */}
      <CameraRig specimen={specimen} />

      {/* Post-processing for scan effects */}
      <ScanEffect />

      {/* The dinosaur specimen */}
      <Suspense fallback={<LoadingFallback />}>
        {specimen && <Specimen data={specimen} />}
      </Suspense>

      {/* Environment map for reflections */}
      <Environment preset="warehouse" environmentIntensity={0.3} />
    </>
  );
}

// -----------------------------------------------------------------------------
// Main Scene Export
// -----------------------------------------------------------------------------

export function Scene() {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      }}
      camera={{
        fov: 45,
        near: 0.1,
        far: 100,
        position: [5, 3, 8],
      }}
      style={{
        background: 'linear-gradient(180deg, #050505 0%, #0a0908 100%)',
      }}
    >
      <SceneContent />
    </Canvas>
  );
}
