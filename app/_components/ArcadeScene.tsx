'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, useAnimations, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { type JoyVector } from '../_lib/arcade/config';

const GLB_PATH = '/models/rexy/rexy_jurassic_world_alive.glb';
const FADE_SECONDS = 0.2;
const WALK_METERS_PER_SECOND = 3.2;
const TURN_RADIANS_PER_SECOND = 1.25;
const ARENA_RADIUS = 18;

export type WalkDirection = 'forward' | 'reverse';
export type RotationMode = 'off' | 'left' | 'right';
export type ArcadeAnimCueKind = 'minion_spawn' | 'next_round' | 'player_spawn' | 'spawn' | 'victory';

export interface ArcadeAnimCue {
  kind: ArcadeAnimCueKind;
  nonce: number;
}

interface ArcadeRigProps {
  joyRef: MutableRefObject<JoyVector>;
  resetToken: number;
  walkEnabled: boolean;
  walkDirection: WalkDirection;
  rotationMode: RotationMode;
  animationCue: ArcadeAnimCue | null;
  onModelRadiusChange: (radius: number) => void;
}

interface ArcadeSceneProps {
  joyRef: MutableRefObject<JoyVector>;
  resetToken: number;
  walkEnabled: boolean;
  walkDirection: WalkDirection;
  rotationMode: RotationMode;
  animationCue: ArcadeAnimCue | null;
}

interface ClipSet {
  walk: string | null;
  minionSpawn: string | null;
  nextRound: string | null;
  playerSpawn: string | null;
  spawn: string | null;
  victory: string | null;
  victoryIn: string | null;
  victoryOut: string | null;
  victoryIdle: string | null;
  idleFallback: string | null;
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

function normalizeClipName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function pickClip(animations: THREE.AnimationClip[], matcher: (normalized: string) => boolean): string | null {
  for (const clip of animations) {
    const normalized = normalizeClipName(clip.name);
    if (normalized.includes('death')) continue;
    if (matcher(normalized)) return clip.name;
  }
  return null;
}

function buildClipSet(animations: THREE.AnimationClip[]): ClipSet {
  const walk = pickClip(animations, (normalized) => normalized.includes('radarbwalk'));
  const minionSpawn = pickClip(animations, (normalized) => normalized.includes('raidminionspawn'));
  const nextRound = pickClip(animations, (normalized) => normalized.includes('raidnextround'));
  const playerSpawn = pickClip(animations, (normalized) => normalized.includes('raidplayerspawn'));
  const spawn = pickClip(
    animations,
    (normalized) =>
      normalized.includes('raidspawn') &&
      !normalized.includes('minion') &&
      !normalized.includes('player'),
  );
  const victoryIn = pickClip(animations, (normalized) => normalized.includes('raidvictoryin'));
  const victoryOut = pickClip(animations, (normalized) => normalized.includes('raidvictoryout'));
  const victoryIdle = pickClip(animations, (normalized) => normalized.includes('raidvictoryidle'));
  const victory = pickClip(
    animations,
    (normalized) =>
      normalized.includes('raidvictory') &&
      !normalized.includes('idle') &&
      !normalized.includes('in') &&
      !normalized.includes('out'),
  );

  return {
    walk,
    minionSpawn,
    nextRound,
    playerSpawn,
    spawn,
    victory,
    victoryIn,
    victoryOut,
    victoryIdle,
    idleFallback: victoryIdle ?? nextRound ?? spawn,
  };
}

interface RexyArcadeModelProps {
  walkEnabled: boolean;
  animationCue: ArcadeAnimCue | null;
  resetToken: number;
  onBoundsRadiusChange?: (radius: number) => void;
}

function RexyArcadeModel({ walkEnabled, animationCue, resetToken, onBoundsRadiusChange }: RexyArcadeModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(GLB_PATH);
  const { actions } = useAnimations(animations, groupRef);

  const clipSet = useMemo(() => buildClipSet(animations), [animations]);
  const clipDurations = useMemo(
    () => new Map(animations.map((clip) => [clip.name, clip.duration] as const)),
    [animations],
  );

  const currentActionRef = useRef<THREE.AnimationAction | null>(null);
  const fadeStopTimerRef = useRef<number | null>(null);
  const sequenceTimersRef = useRef<number[]>([]);
  const sequenceTokenRef = useRef(0);
  const sequenceActiveRef = useRef(false);
  const walkEnabledRef = useRef(walkEnabled);
  const clipSetRef = useRef(clipSet);

  useEffect(() => {
    walkEnabledRef.current = walkEnabled;
  }, [walkEnabled]);

  useEffect(() => {
    clipSetRef.current = clipSet;
  }, [clipSet]);

  const transform = useMemo(() => {
    scene.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(scene);
    const center = box.getCenter(new THREE.Vector3());
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const radius = Number.isFinite(sphere.radius) && sphere.radius > 0.001 ? sphere.radius : 6;
    return {
      offset: [-center.x, -box.min.y, -center.z] as [number, number, number],
      radius,
    };
  }, [scene]);

  useEffect(() => {
    onBoundsRadiusChange?.(transform.radius);
  }, [onBoundsRadiusChange, transform.radius]);

  const clearFadeStopTimer = useCallback(() => {
    if (fadeStopTimerRef.current !== null) {
      window.clearTimeout(fadeStopTimerRef.current);
      fadeStopTimerRef.current = null;
    }
  }, []);

  const clearSequenceTimers = useCallback(() => {
    sequenceTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    sequenceTimersRef.current = [];
  }, []);

  const playClip = useCallback(
    (clipName: string | null, loop: boolean): THREE.AnimationAction | null => {
      if (!clipName) return null;
      const nextAction = actions[clipName];
      if (!nextAction) return null;

      clearFadeStopTimer();

      const previousAction = currentActionRef.current;
      nextAction.enabled = true;
      nextAction.setEffectiveWeight(1);
      nextAction.setEffectiveTimeScale(1);
      nextAction.clampWhenFinished = !loop;
      nextAction.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);

      if (previousAction && previousAction !== nextAction) {
        previousAction.fadeOut(FADE_SECONDS);
        nextAction.reset();
        nextAction.crossFadeFrom(previousAction, FADE_SECONDS, false);
        nextAction.play();
        const actionToStop = previousAction;
        fadeStopTimerRef.current = window.setTimeout(() => {
          actionToStop.stop();
          fadeStopTimerRef.current = null;
        }, FADE_SECONDS * 1000 + 40);
      } else {
        nextAction.reset();
        nextAction.fadeIn(FADE_SECONDS).play();
      }

      currentActionRef.current = nextAction;
      return nextAction;
    },
    [actions, clearFadeStopTimer],
  );

  const syncBaseline = useCallback(() => {
    if (sequenceActiveRef.current) return;
    const activeClipSet = clipSetRef.current;

    if (walkEnabledRef.current) {
      playClip(activeClipSet.walk, true);
      return;
    }

    playClip(activeClipSet.idleFallback, true);
  }, [playClip]);

  const runSequence = useCallback(
    (clips: Array<string | null>) => {
      const sequence = clips.filter((clipName): clipName is string => Boolean(clipName));
      if (sequence.length === 0) {
        syncBaseline();
        return;
      }

      sequenceTokenRef.current += 1;
      const token = sequenceTokenRef.current;
      sequenceActiveRef.current = true;
      clearSequenceTimers();

      let elapsedMs = 0;
      const overlapMs = FADE_SECONDS * 550;
      for (const clipName of sequence) {
        const startMs = elapsedMs;
        sequenceTimersRef.current.push(
          window.setTimeout(() => {
            if (sequenceTokenRef.current !== token) return;
            playClip(clipName, false);
          }, startMs),
        );

        const durationMs = Math.max(120, (clipDurations.get(clipName) ?? 0.8) * 1000);
        elapsedMs += Math.max(120, durationMs - overlapMs);
      }

      sequenceTimersRef.current.push(
        window.setTimeout(() => {
          if (sequenceTokenRef.current !== token) return;
          sequenceActiveRef.current = false;
          syncBaseline();
        }, elapsedMs + 40),
      );
    },
    [clearSequenceTimers, clipDurations, playClip, syncBaseline],
  );

  useEffect(() => {
    syncBaseline();
  }, [clipSet, syncBaseline, walkEnabled]);

  useEffect(() => {
    if (!animationCue) return;

    switch (animationCue.kind) {
      case 'minion_spawn':
        runSequence([clipSet.minionSpawn]);
        break;
      case 'next_round':
        runSequence([clipSet.nextRound]);
        break;
      case 'player_spawn':
        runSequence([clipSet.playerSpawn]);
        break;
      case 'spawn':
        runSequence([clipSet.spawn]);
        break;
      case 'victory': {
        const victorySequence: Array<string | null> = [];
        if (clipSet.victoryIn) victorySequence.push(clipSet.victoryIn);
        victorySequence.push(clipSet.victory ?? clipSet.victoryIdle);
        if (clipSet.victoryOut) victorySequence.push(clipSet.victoryOut);
        runSequence(victorySequence);
        break;
      }
      default:
        break;
    }
  }, [
    animationCue,
    clipSet.minionSpawn,
    clipSet.nextRound,
    clipSet.playerSpawn,
    clipSet.spawn,
    clipSet.victory,
    clipSet.victoryIdle,
    clipSet.victoryIn,
    clipSet.victoryOut,
    runSequence,
  ]);

  useEffect(() => {
    sequenceTokenRef.current += 1;
    sequenceActiveRef.current = false;
    clearSequenceTimers();
    clearFadeStopTimer();
    Object.values(actions).forEach((action) => {
      action?.stop();
    });
    currentActionRef.current = null;
    syncBaseline();
  }, [actions, clearFadeStopTimer, clearSequenceTimers, resetToken, syncBaseline]);

  useEffect(() => {
    return () => {
      sequenceTokenRef.current += 1;
      clearSequenceTimers();
      clearFadeStopTimer();
      Object.values(actions).forEach((action) => action?.stop());
      currentActionRef.current = null;
    };
  }, [actions, clearFadeStopTimer, clearSequenceTimers]);

  return (
    <group ref={groupRef}>
      <group position={transform.offset}>
        <primitive object={scene} />
      </group>
    </group>
  );
}

function ArcadeRig({
  joyRef,
  resetToken,
  walkEnabled,
  walkDirection,
  rotationMode,
  animationCue,
  onModelRadiusChange,
}: ArcadeRigProps) {
  const groupRef = useRef<THREE.Group>(null);
  const headingRef = useRef(0);
  const bodyYawRef = useRef(0);
  const walkVectorRef = useRef(new THREE.Vector3());

  useEffect(() => {
    headingRef.current = 0;
    bodyYawRef.current = 0;
    if (groupRef.current) {
      groupRef.current.position.set(0, 0, 0);
      groupRef.current.rotation.set(0, 0, 0);
    }
  }, [resetToken]);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;

    const rotationDirection = rotationMode === 'left' ? 1 : rotationMode === 'right' ? -1 : 0;
    headingRef.current += rotationDirection * TURN_RADIANS_PER_SECOND * delta;
    const directionOffset = walkDirection === 'reverse' ? Math.PI : 0;
    const targetYaw = headingRef.current + directionOffset;
    bodyYawRef.current = THREE.MathUtils.damp(bodyYawRef.current, targetYaw, 8, delta);
    group.rotation.y = bodyYawRef.current;

    if (!walkEnabled) return;

    const throttle = THREE.MathUtils.clamp(Math.abs(joyRef.current.y), 0, 1);
    const walkSpeed = WALK_METERS_PER_SECOND * (0.55 + throttle * 0.75);
    walkVectorRef.current.set(Math.sin(group.rotation.y), 0, Math.cos(group.rotation.y));
    group.position.addScaledVector(walkVectorRef.current, walkSpeed * delta);

    const radius = group.position.length();
    if (radius > ARENA_RADIUS) {
      group.position.multiplyScalar(ARENA_RADIUS / radius);
    }
  });

  return (
    <group ref={groupRef}>
      <RexyArcadeModel
        walkEnabled={walkEnabled}
        animationCue={animationCue}
        resetToken={resetToken}
        onBoundsRadiusChange={onModelRadiusChange}
      />
    </group>
  );
}

function AutoFitArcadeCamera({ radius }: { radius: number }) {
  const { camera } = useThree();

  useEffect(() => {
    const safeRadius = Math.max(0.1, Math.min(radius, 350));
    const distance = Math.max(10, Math.min(safeRadius * 2.35, 120));
    camera.position.set(0, safeRadius * 0.5, distance);
    camera.near = Math.max(0.01, distance / 4500);
    camera.far = Math.max(2500, distance * 24);
    camera.lookAt(0, safeRadius * 0.2, 0);
    camera.updateProjectionMatrix();
  }, [camera, radius]);

  return null;
}

export function ArcadeScene({
  joyRef,
  resetToken,
  walkEnabled,
  walkDirection,
  rotationMode,
  animationCue,
}: ArcadeSceneProps) {
  const [modelRadius, setModelRadius] = useState(6);

  return (
    <Canvas
      camera={{ position: [0, 3.6, 16], fov: 42 }}
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
        <AutoFitArcadeCamera radius={modelRadius} />
        <ArcadeRig
          joyRef={joyRef}
          resetToken={resetToken}
          walkEnabled={walkEnabled}
          walkDirection={walkDirection}
          rotationMode={rotationMode}
          animationCue={animationCue}
          onModelRadiusChange={setModelRadius}
        />
      </Suspense>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <circleGeometry args={[220, 96]} />
        <meshStandardMaterial color="#0d1325" />
      </mesh>
    </Canvas>
  );
}

useGLTF.preload(GLB_PATH);
