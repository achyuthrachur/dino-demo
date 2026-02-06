'use client';

// =============================================================================
// CameraRig.tsx - Choreographed Camera Controls with Pedestal Swap Animation
// =============================================================================

import { useRef, useEffect, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { SpecimenData } from '@/lib/types';
import { useExhibitStore } from '@/lib/store';

// Type guard for PerspectiveCamera
function isPerspectiveCamera(camera: THREE.Camera): camera is THREE.PerspectiveCamera {
  return (camera as THREE.PerspectiveCamera).isPerspectiveCamera === true;
}

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface CameraRigProps {
  specimen: SpecimenData | null;
}

type AnimationPhase = 'idle' | 'whip-out' | 'hold' | 'whip-in';

// -----------------------------------------------------------------------------
// Animation Constants
// -----------------------------------------------------------------------------

const WHIP_PAN_DURATION = 0.35; // seconds (snappier)
const WHIP_PAN_DISTANCE = 18; // horizontal offset during whip (wider sweep)
const HOLD_DURATION = 0.08; // brief pause at apex
const FOV_BASE = 45;
const FOV_PEAK = 65; // more dramatic FOV zoom for motion blur feel

// -----------------------------------------------------------------------------
// Camera Rig Component
// -----------------------------------------------------------------------------

export function CameraRig({ specimen }: CameraRigProps) {
  const controlsRef = useRef<React.ComponentRef<typeof OrbitControls>>(null);
  const { camera } = useThree();

  const cameraTarget = useExhibitStore((state) => state.cameraTarget);
  const presenterActive = useExhibitStore((state) => state.presenterActive);
  const selectedSpecimenId = useExhibitStore((state) => state.selectedSpecimenId);

  // Animation state
  const [animationPhase, setAnimationPhase] = useState<AnimationPhase>('idle');
  const animationProgress = useRef(0);
  const previousSpecimenId = useRef<string | null>(null);

  // Target positions for smooth interpolation
  const targetPosition = useRef(new THREE.Vector3(5, 3, 8));
  const targetLookAt = useRef(new THREE.Vector3(0, 1, 0));

  // Whip pan offset
  const whipOffset = useRef(new THREE.Vector3());

  // Base position before whip
  const basePosition = useRef(new THREE.Vector3());

  // Detect specimen change and trigger whip pan
  useEffect(() => {
    if (
      previousSpecimenId.current !== null &&
      previousSpecimenId.current !== selectedSpecimenId
    ) {
      // Trigger whip pan animation
      setAnimationPhase('whip-out');
      animationProgress.current = 0;
      basePosition.current.copy(camera.position);

      // Calculate whip direction (perpendicular to camera direction)
      const cameraDir = new THREE.Vector3();
      camera.getWorldDirection(cameraDir);
      whipOffset.current
        .crossVectors(cameraDir, new THREE.Vector3(0, 1, 0))
        .normalize()
        .multiplyScalar(WHIP_PAN_DISTANCE);
    }

    previousSpecimenId.current = selectedSpecimenId;
  }, [selectedSpecimenId, camera]);

  // Get camera position based on target and specimen
  useEffect(() => {
    if (!specimen) return;

    const cameraPositions = specimen.presentation.camera;
    let newPosition: [number, number, number];

    switch (cameraTarget) {
      case 'head':
        newPosition = cameraPositions.head;
        break;
      case 'claw':
        newPosition = cameraPositions.claw || cameraPositions.idle;
        break;
      case 'idle':
      default:
        newPosition = cameraPositions.idle;
        break;
    }

    // Apply specimen scale to camera distance
    const scale = specimen.presentation.scale;
    targetPosition.current.set(
      newPosition[0] / scale,
      newPosition[1] / scale,
      newPosition[2] / scale
    );

    // Adjust look-at based on camera target
    switch (cameraTarget) {
      case 'head':
        targetLookAt.current.set(1, 1.2, 0);
        break;
      case 'claw':
        targetLookAt.current.set(0, 0.3, 0);
        break;
      default:
        targetLookAt.current.set(0, 1, 0);
    }
  }, [specimen, cameraTarget]);

  // Animation and camera movement
  useFrame((state, delta) => {
    if (!controlsRef.current) return;

    const controls = controlsRef.current;

    // Handle whip pan animation
    if (animationPhase !== 'idle') {
      animationProgress.current += delta;

      switch (animationPhase) {
        case 'whip-out': {
          const t = Math.min(animationProgress.current / WHIP_PAN_DURATION, 1);
          // Spring-like ease with slight overshoot (PRD: heavy spring physics)
          const eased = t < 1
            ? 1 - Math.pow(1 - t, 4) * Math.cos(t * Math.PI * 0.5)
            : 1;

          // Apply horizontal offset
          const offset = whipOffset.current.clone().multiplyScalar(eased);
          camera.position.copy(basePosition.current).add(offset);

          // Dramatic FOV change for motion blur feel
          if (isPerspectiveCamera(camera)) {
            camera.fov = FOV_BASE + eased * (FOV_PEAK - FOV_BASE);
            camera.updateProjectionMatrix();
          }

          if (t >= 1) {
            setAnimationPhase('hold');
            animationProgress.current = 0;
          }
          break;
        }

        case 'hold': {
          if (animationProgress.current >= HOLD_DURATION) {
            setAnimationPhase('whip-in');
            animationProgress.current = 0;
            // Reset base position to target
            basePosition.current.copy(targetPosition.current).add(whipOffset.current);
          }
          break;
        }

        case 'whip-in': {
          const t = Math.min(animationProgress.current / WHIP_PAN_DURATION, 1);
          // Spring-like ease-in with deceleration (smooth landing)
          const eased = 1 - Math.pow(1 - t, 3) * (1 - t);

          // Interpolate from offset position to target
          camera.position.lerpVectors(
            basePosition.current,
            targetPosition.current,
            eased
          );

          // Return FOV to normal with spring settle
          if (isPerspectiveCamera(camera)) {
            camera.fov = FOV_PEAK - eased * (FOV_PEAK - FOV_BASE);
            camera.updateProjectionMatrix();

            if (t >= 1) {
              camera.fov = FOV_BASE;
              camera.updateProjectionMatrix();
            }
          }

          if (t >= 1) {
            setAnimationPhase('idle');
          }
          break;
        }
      }

      // During animation, smoothly update look-at
      controls.target.lerp(targetLookAt.current, delta * 5);
      controls.update();
      return;
    }

    // Normal smooth camera interpolation (when not animating)
    const lerpFactor = 1 - Math.pow(0.001, delta);

    camera.position.lerp(targetPosition.current, lerpFactor * 2);

    // Update OrbitControls target
    if (controls.target) {
      controls.target.lerp(targetLookAt.current, lerpFactor * 2);
    }

    // Auto-rotate when in presenter mode
    if (presenterActive) {
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.5;
    } else {
      controls.autoRotate = false;
    }

    controls.update();
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.05}
      minDistance={2}
      maxDistance={30}
      minPolarAngle={Math.PI * 0.1}
      maxPolarAngle={Math.PI * 0.85}
      enablePan={!presenterActive && animationPhase === 'idle'}
      enableZoom={!presenterActive && animationPhase === 'idle'}
      enableRotate={!presenterActive && animationPhase === 'idle'}
      target={[0, 1, 0]}
    />
  );
}
