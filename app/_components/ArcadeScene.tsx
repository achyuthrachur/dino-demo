'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, useAnimations, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { ARCADE_CONFIG, applyDeadzone, type JoyVector } from '../_lib/arcade/config';

const GLB_PATH = '/models/rexy/rexy_jurassic_world_alive.glb';
const FADE_SECONDS = 0.2;
const WALK_METERS_PER_SECOND = 3.2;
const TURN_RADIANS_PER_SECOND = 1.8;
const ARENA_RADIUS = 18;
const CAMERA_YAW_RADIANS_PER_SECOND = 2.15;
const CAMERA_PITCH_RADIANS_PER_SECOND = 2.25;
const CAMERA_DEFAULT_PITCH_RADIANS = THREE.MathUtils.degToRad(62);
const CAMERA_MIN_PITCH_RADIANS = THREE.MathUtils.degToRad(28);
const CAMERA_MAX_PITCH_RADIANS = THREE.MathUtils.degToRad(80);
const CAMERA_DISTANCE_MULTIPLIER = 2.08;
const CAMERA_TARGET_SMOOTHING_PER_SECOND = 9;
const CAMERA_POSITION_SMOOTHING_PER_SECOND = 10;
const CAMERA_INPUT_SMOOTHING_PER_SECOND = 13;
const CAMERA_STICK_DEADZONE = 0.02;

export type ArcadeAnimCueKind = 'minion_spawn' | 'next_round' | 'player_spawn' | 'spawn' | 'victory';

export interface ArcadeAnimCue {
  kind: ArcadeAnimCueKind;
  nonce: number;
}

interface ArcadeRigProps {
  actorRef: MutableRefObject<THREE.Group | null>;
  moveRef: MutableRefObject<JoyVector>;
  resetToken: number;
  animationCue: ArcadeAnimCue | null;
  onModelRadiusChange: (radius: number) => void;
}

interface ArcadeSceneProps {
  moveRef: MutableRefObject<JoyVector>;
  aimRef: MutableRefObject<JoyVector>;
  resetToken: number;
  animationCue: ArcadeAnimCue | null;
}

interface ClipSet {
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

function isWalkCycleClipName(normalizedClipName: string): boolean {
  if (normalizedClipName.includes('raidminionspawn')) return true;
  return (
    normalizedClipName.includes('raidspawn') &&
    !normalizedClipName.includes('minion') &&
    !normalizedClipName.includes('player')
  );
}

function getTrackNodeName(trackName: string): string {
  const dotIndex = trackName.lastIndexOf('.');
  return dotIndex >= 0 ? trackName.slice(0, dotIndex) : trackName;
}

function buildRestPositionMap(root: THREE.Object3D): Map<string, THREE.Vector3> {
  const map = new Map<string, THREE.Vector3>();
  root.traverse((object) => {
    if (!object.name) return;
    map.set(object.name.toLowerCase(), object.position.clone());
  });
  return map;
}

function sampleVectorTrackAtTime(
  times: ArrayLike<number>,
  values: ArrayLike<number>,
  sampleTime: number,
  out: THREE.Vector3,
): THREE.Vector3 {
  const keyCount = times.length;
  if (keyCount === 0) {
    return out.set(0, 0, 0);
  }

  if (sampleTime <= times[0]) {
    return out.set(values[0] ?? 0, values[1] ?? 0, values[2] ?? 0);
  }

  const lastIndex = keyCount - 1;
  if (sampleTime >= times[lastIndex]) {
    const base = lastIndex * 3;
    return out.set(values[base] ?? 0, values[base + 1] ?? 0, values[base + 2] ?? 0);
  }

  let low = 0;
  let high = lastIndex;
  while (low + 1 < high) {
    const mid = (low + high) >> 1;
    if (times[mid] <= sampleTime) {
      low = mid;
    } else {
      high = mid;
    }
  }

  const t0 = times[low];
  const t1 = times[high];
  const alpha = t1 - t0 > 1e-6 ? (sampleTime - t0) / (t1 - t0) : 0;
  const i0 = low * 3;
  const i1 = high * 3;
  out.set(
    THREE.MathUtils.lerp(values[i0] ?? 0, values[i1] ?? 0, alpha),
    THREE.MathUtils.lerp(values[i0 + 1] ?? 0, values[i1 + 1] ?? 0, alpha),
    THREE.MathUtils.lerp(values[i0 + 2] ?? 0, values[i1 + 2] ?? 0, alpha),
  );
  return out;
}

function findRootMotionTrack(clip: THREE.AnimationClip): THREE.VectorKeyframeTrack | null {
  const positionTracks = clip.tracks.filter(
    (track): track is THREE.VectorKeyframeTrack =>
      track instanceof THREE.VectorKeyframeTrack && track.name.toLowerCase().endsWith('.position'),
  );
  if (positionTracks.length === 0) return null;

  const preferred = positionTracks.find((track) => track.name.toLowerCase().includes('pelvis'));
  if (preferred) return preferred;

  const fallback = positionTracks.find(
    (track) => track.name.toLowerCase().includes('root') || track.name.toLowerCase().includes('hips'),
  );
  return fallback ?? positionTracks[0];
}

function neutralizeTrackRootMotion(
  track: THREE.VectorKeyframeTrack,
  restPositionsByNodeName: Map<string, THREE.Vector3>,
  rootMotionTrack: THREE.VectorKeyframeTrack,
): THREE.KeyframeTrack {
  if (!track.name.toLowerCase().endsWith('.position')) {
    return track.clone();
  }

  const trackValues = track.values.slice();
  const firstTrackX = trackValues[0] ?? 0;
  const firstTrackY = trackValues[1] ?? 0;
  const firstTrackZ = trackValues[2] ?? 0;
  const nodeName = getTrackNodeName(track.name).toLowerCase();
  const restPosition = restPositionsByNodeName.get(nodeName) ?? new THREE.Vector3(0, 0, 0);

  const rootFirstX = rootMotionTrack.values[0] ?? 0;
  const rootFirstY = rootMotionTrack.values[1] ?? 0;
  const rootFirstZ = rootMotionTrack.values[2] ?? 0;
  const rootSample = new THREE.Vector3();

  for (let i = 0; i < trackValues.length; i += 3) {
    const keyframeIndex = i / 3;
    const sampleTime = track.times[keyframeIndex] ?? 0;
    sampleVectorTrackAtTime(rootMotionTrack.times, rootMotionTrack.values, sampleTime, rootSample);

    const localDeltaX = (trackValues[i] ?? 0) - firstTrackX;
    const localDeltaY = (trackValues[i + 1] ?? 0) - firstTrackY;
    const localDeltaZ = (trackValues[i + 2] ?? 0) - firstTrackZ;

    const rootDeltaX = rootSample.x - rootFirstX;
    const rootDeltaY = rootSample.y - rootFirstY;
    const rootDeltaZ = rootSample.z - rootFirstZ;

    trackValues[i] = restPosition.x + localDeltaX - rootDeltaX;
    trackValues[i + 1] = restPosition.y + localDeltaY - rootDeltaY;
    trackValues[i + 2] = restPosition.z + localDeltaZ - rootDeltaZ;
  }

  return new THREE.VectorKeyframeTrack(track.name, track.times.slice(), trackValues, track.getInterpolation());
}

function prepareAnimationsForArcade(
  animations: THREE.AnimationClip[],
  restPositionsByNodeName: Map<string, THREE.Vector3>,
): THREE.AnimationClip[] {
  return animations.map((clip) => {
    const normalized = normalizeClipName(clip.name);
    if (!isWalkCycleClipName(normalized)) {
      return clip;
    }

    const cloned = clip.clone();
    const rootMotionTrack = findRootMotionTrack(cloned);
    if (!rootMotionTrack) {
      return cloned;
    }
    cloned.tracks = cloned.tracks.map((track) =>
      track instanceof THREE.VectorKeyframeTrack
        ? neutralizeTrackRootMotion(track, restPositionsByNodeName, rootMotionTrack)
        : track.clone(),
    );
    return cloned;
  });
}

interface RexyArcadeModelProps {
  walkLoopEnabled: boolean;
  animationCue: ArcadeAnimCue | null;
  resetToken: number;
  onBoundsRadiusChange?: (radius: number) => void;
}

function RexyArcadeModel({ walkLoopEnabled, animationCue, resetToken, onBoundsRadiusChange }: RexyArcadeModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(GLB_PATH);
  const restPositionsByNodeName = useMemo(() => buildRestPositionMap(scene), [scene]);
  const preparedAnimations = useMemo(
    () => prepareAnimationsForArcade(animations, restPositionsByNodeName),
    [animations, restPositionsByNodeName],
  );
  const { actions } = useAnimations(preparedAnimations, groupRef);

  const clipSet = useMemo(() => buildClipSet(preparedAnimations), [preparedAnimations]);
  const clipDurations = useMemo(
    () => new Map(preparedAnimations.map((clip) => [clip.name, clip.duration] as const)),
    [preparedAnimations],
  );

  const currentActionRef = useRef<THREE.AnimationAction | null>(null);
  const fadeStopTimerRef = useRef<number | null>(null);
  const sequenceTimersRef = useRef<number[]>([]);
  const sequenceTokenRef = useRef(0);
  const sequenceActiveRef = useRef(false);
  const walkCycleTimersRef = useRef<number[]>([]);
  const walkCycleTokenRef = useRef(0);
  const walkCycleActiveRef = useRef(false);
  const walkLoopEnabledRef = useRef(walkLoopEnabled);
  const clipSetRef = useRef(clipSet);

  useEffect(() => {
    walkLoopEnabledRef.current = walkLoopEnabled;
  }, [walkLoopEnabled]);

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

  const clearWalkCycleTimers = useCallback(() => {
    walkCycleTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    walkCycleTimersRef.current = [];
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

  const stopWalkCycle = useCallback(() => {
    walkCycleTokenRef.current += 1;
    walkCycleActiveRef.current = false;
    clearWalkCycleTimers();
  }, [clearWalkCycleTimers]);

  const startWalkCycle = useCallback(() => {
    const activeClipSet = clipSetRef.current;
    const cycleClips = [activeClipSet.minionSpawn, activeClipSet.spawn].filter(
      (clipName): clipName is string => Boolean(clipName),
    );
    if (cycleClips.length === 0) {
      playClip(activeClipSet.idleFallback, true);
      return;
    }

    stopWalkCycle();
    const token = walkCycleTokenRef.current;
    walkCycleActiveRef.current = true;

    const overlapMs = FADE_SECONDS * 550;
    let elapsedMs = 0;
    for (const clipName of cycleClips) {
      const startMs = elapsedMs;
      walkCycleTimersRef.current.push(
        window.setTimeout(() => {
          if (walkCycleTokenRef.current !== token) return;
          playClip(clipName, false);
        }, startMs),
      );
      const durationMs = Math.max(120, (clipDurations.get(clipName) ?? 0.8) * 1000);
      elapsedMs += Math.max(120, durationMs - overlapMs);
    }

    walkCycleTimersRef.current.push(
      window.setTimeout(() => {
        if (walkCycleTokenRef.current !== token) return;
        walkCycleActiveRef.current = false;
        if (walkLoopEnabledRef.current && !sequenceActiveRef.current) {
          startWalkCycle();
          return;
        }
        playClip(activeClipSet.idleFallback, true);
      }, elapsedMs + 40),
    );
  }, [clipDurations, playClip, stopWalkCycle]);

  const syncBaseline = useCallback(() => {
    if (sequenceActiveRef.current) return;
    const activeClipSet = clipSetRef.current;

    if (walkLoopEnabledRef.current) {
      if (!walkCycleActiveRef.current) {
        startWalkCycle();
      }
      return;
    }

    stopWalkCycle();
    playClip(activeClipSet.idleFallback, true);
  }, [playClip, startWalkCycle, stopWalkCycle]);

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
      stopWalkCycle();

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
    [clearSequenceTimers, clipDurations, playClip, stopWalkCycle, syncBaseline],
  );

  useEffect(() => {
    syncBaseline();
  }, [clipSet, syncBaseline, walkLoopEnabled]);

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
    stopWalkCycle();
    clearFadeStopTimer();
    Object.values(actions).forEach((action) => {
      action?.stop();
    });
    currentActionRef.current = null;
    syncBaseline();
  }, [actions, clearFadeStopTimer, clearSequenceTimers, resetToken, stopWalkCycle, syncBaseline]);

  useEffect(() => {
    return () => {
      sequenceTokenRef.current += 1;
      clearSequenceTimers();
      stopWalkCycle();
      clearFadeStopTimer();
      Object.values(actions).forEach((action) => action?.stop());
      currentActionRef.current = null;
    };
  }, [actions, clearFadeStopTimer, clearSequenceTimers, stopWalkCycle]);

  return (
    <group ref={groupRef}>
      <group position={transform.offset}>
        <primitive object={scene} />
      </group>
    </group>
  );
}

function ArcadeRig({
  actorRef,
  moveRef,
  resetToken,
  animationCue,
  onModelRadiusChange,
}: ArcadeRigProps) {
  const [walkLoopEnabled, setWalkLoopEnabled] = useState(false);
  const walkLoopEnabledRef = useRef(false);
  const headingYawRef = useRef(0);
  const bodyYawRef = useRef(0);
  const forwardDirectionRef = useRef(new THREE.Vector3());
  const targetVelocityRef = useRef(new THREE.Vector3());
  const velocityRef = useRef(new THREE.Vector3());

  useEffect(() => {
    walkLoopEnabledRef.current = false;
    setWalkLoopEnabled(false);
    headingYawRef.current = 0;
    bodyYawRef.current = 0;
    targetVelocityRef.current.set(0, 0, 0);
    velocityRef.current.set(0, 0, 0);
    if (actorRef.current) {
      actorRef.current.position.set(0, 0, 0);
      actorRef.current.rotation.set(0, 0, 0);
    }
  }, [actorRef, resetToken]);

  useFrame((_, delta) => {
    const group = actorRef.current;
    if (!group) return;

    const move = moveRef.current;
    const turnInput = applyDeadzone(move.x, ARCADE_CONFIG.deadzone);
    const throttleInput = applyDeadzone(move.y, ARCADE_CONFIG.deadzone);
    headingYawRef.current += turnInput * TURN_RADIANS_PER_SECOND * delta;
    bodyYawRef.current = THREE.MathUtils.damp(bodyYawRef.current, headingYawRef.current, 9, delta);
    group.rotation.y = bodyYawRef.current;

    const shouldWalkLoop = Math.abs(throttleInput) > 0.001;
    if (shouldWalkLoop !== walkLoopEnabledRef.current) {
      walkLoopEnabledRef.current = shouldWalkLoop;
      setWalkLoopEnabled(shouldWalkLoop);
    }

    if (Math.abs(throttleInput) > 0.001) {
      forwardDirectionRef.current.set(Math.sin(group.rotation.y), 0, Math.cos(group.rotation.y));
      targetVelocityRef.current.copy(forwardDirectionRef.current).multiplyScalar(throttleInput * WALK_METERS_PER_SECOND);
    } else {
      targetVelocityRef.current.set(0, 0, 0);
    }
    const alpha = 1 - Math.exp(-ARCADE_CONFIG.smoothingPerSecond * delta);
    velocityRef.current.lerp(targetVelocityRef.current, alpha);
    group.position.addScaledVector(velocityRef.current, delta);

    const radius = group.position.length();
    if (radius > ARENA_RADIUS) {
      group.position.multiplyScalar(ARENA_RADIUS / radius);
    }
  });

  return (
    <group ref={actorRef}>
      <RexyArcadeModel
        walkLoopEnabled={walkLoopEnabled}
        animationCue={animationCue}
        resetToken={resetToken}
        onBoundsRadiusChange={onModelRadiusChange}
      />
    </group>
  );
}

interface ArcadeFollowCameraProps {
  actorRef: MutableRefObject<THREE.Group | null>;
  aimRef: MutableRefObject<JoyVector>;
  radius: number;
  resetToken: number;
}

function ArcadeFollowCamera({ actorRef, aimRef, radius, resetToken }: ArcadeFollowCameraProps) {
  const { camera } = useThree();
  const yawRef = useRef(0);
  const pitchRef = useRef(CAMERA_DEFAULT_PITCH_RADIANS);
  const smoothedInputXRef = useRef(0);
  const smoothedInputYRef = useRef(0);
  const smoothedTargetRef = useRef(new THREE.Vector3());
  const orbitOffsetRef = useRef(new THREE.Vector3());
  const desiredPositionRef = useRef(new THREE.Vector3());
  const lookAtRef = useRef(new THREE.Vector3());

  useEffect(() => {
    yawRef.current = 0;
    pitchRef.current = CAMERA_DEFAULT_PITCH_RADIANS;
    smoothedInputXRef.current = 0;
    smoothedInputYRef.current = 0;
    smoothedTargetRef.current.set(0, 0, 0);
    const safeRadius = Math.max(0.1, Math.min(radius, 120));
    const distance = Math.max(10, Math.min(safeRadius * CAMERA_DISTANCE_MULTIPLIER, 36));
    const horizontalDistance = distance * Math.cos(pitchRef.current);
    const verticalDistance = distance * Math.sin(pitchRef.current);
    camera.position.set(0, verticalDistance, horizontalDistance);
    camera.near = Math.max(0.01, distance / 4500);
    camera.far = Math.max(2500, distance * 30);
    camera.lookAt(0, safeRadius * 0.12, 0);
    camera.updateProjectionMatrix();
  }, [camera, radius, resetToken]);

  useFrame((_, delta) => {
    const cameraInputX = applyDeadzone(aimRef.current.x, CAMERA_STICK_DEADZONE);
    const cameraInputY = applyDeadzone(aimRef.current.y, CAMERA_STICK_DEADZONE);
    smoothedInputXRef.current = THREE.MathUtils.damp(
      smoothedInputXRef.current,
      cameraInputX,
      CAMERA_INPUT_SMOOTHING_PER_SECOND,
      delta,
    );
    smoothedInputYRef.current = THREE.MathUtils.damp(
      smoothedInputYRef.current,
      cameraInputY,
      CAMERA_INPUT_SMOOTHING_PER_SECOND,
      delta,
    );
    yawRef.current += smoothedInputXRef.current * CAMERA_YAW_RADIANS_PER_SECOND * delta;
    pitchRef.current = THREE.MathUtils.clamp(
      pitchRef.current + smoothedInputYRef.current * CAMERA_PITCH_RADIANS_PER_SECOND * delta,
      CAMERA_MIN_PITCH_RADIANS,
      CAMERA_MAX_PITCH_RADIANS,
    );

    const actorPosition = actorRef.current?.position;
    if (actorPosition) {
      const followAlpha = 1 - Math.exp(-CAMERA_TARGET_SMOOTHING_PER_SECOND * delta);
      smoothedTargetRef.current.lerp(actorPosition, followAlpha);
    }

    const safeRadius = Math.max(0.1, Math.min(radius, 120));
    const distance = Math.max(10, Math.min(safeRadius * CAMERA_DISTANCE_MULTIPLIER, 36));
    const horizontalDistance = distance * Math.cos(pitchRef.current);
    const verticalDistance = distance * Math.sin(pitchRef.current);

    orbitOffsetRef.current.set(
      Math.sin(yawRef.current) * horizontalDistance,
      verticalDistance,
      Math.cos(yawRef.current) * horizontalDistance,
    );
    desiredPositionRef.current.copy(smoothedTargetRef.current).add(orbitOffsetRef.current);
    const positionAlpha = 1 - Math.exp(-CAMERA_POSITION_SMOOTHING_PER_SECOND * delta);
    camera.position.lerp(desiredPositionRef.current, positionAlpha);

    lookAtRef.current.copy(smoothedTargetRef.current);
    lookAtRef.current.y += safeRadius * 0.12;
    camera.lookAt(lookAtRef.current);
  });

  return null;
}

export function ArcadeScene({
  moveRef,
  aimRef,
  resetToken,
  animationCue,
}: ArcadeSceneProps) {
  const [modelRadius, setModelRadius] = useState(6);
  const actorRef = useRef<THREE.Group>(null);

  return (
    <Canvas
      camera={{ position: [0, 18, 10], fov: 42 }}
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
        <ArcadeFollowCamera actorRef={actorRef} aimRef={aimRef} radius={modelRadius} resetToken={resetToken} />
        <ArcadeRig
          actorRef={actorRef}
          moveRef={moveRef}
          resetToken={resetToken}
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
