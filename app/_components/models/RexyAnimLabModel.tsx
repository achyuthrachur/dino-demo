'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useAnimations, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

const GLB_PATH = '/models/rexy/rexy_jurassic_world_alive.glb';
const TARGET_SIZE = 7.5;
const FADE_SECONDS = 0.16;

interface RexyAnimLabModelProps {
  clipToPlay: string | null;
  playNonce: number;
  loopEnabled: boolean;
  playbackSpeed: number;
  onClipNamesChange: (clipNames: string[]) => void;
  onNowPlayingChange: (clipName: string | null) => void;
  onBoundsRadiusChange?: (radius: number) => void;
}

export function RexyAnimLabModel({
  clipToPlay,
  playNonce,
  loopEnabled,
  playbackSpeed,
  onClipNamesChange,
  onNowPlayingChange,
  onBoundsRadiusChange,
}: RexyAnimLabModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(GLB_PATH);
  const { actions, mixer } = useAnimations(animations, groupRef);
  const currentActionRef = useRef<THREE.AnimationAction | null>(null);
  const loopRef = useRef(loopEnabled);
  const fadeStopTimerRef = useRef<number | null>(null);

  const clipNames = useMemo(() => animations.map((clip) => clip.name), [animations]);

  useEffect(() => {
    onClipNamesChange(clipNames);
  }, [clipNames, onClipNamesChange]);

  useEffect(() => {
    loopRef.current = loopEnabled;
  }, [loopEnabled]);

  const transform = useMemo(() => {
    scene.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(scene);
    const center = box.getCenter(new THREE.Vector3());
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const radius = Number.isFinite(sphere.radius) && sphere.radius > 0.001
      ? sphere.radius
      : TARGET_SIZE * 0.5;
    return {
      centerOffset: [-center.x, -center.y, -center.z] as [number, number, number],
      radius,
    };
  }, [scene]);

  useEffect(() => {
    onBoundsRadiusChange?.(transform.radius);
  }, [onBoundsRadiusChange, transform.radius]);

  const clearFadeTimer = useCallback(() => {
    if (fadeStopTimerRef.current !== null) {
      window.clearTimeout(fadeStopTimerRef.current);
      fadeStopTimerRef.current = null;
    }
  }, []);

  const configureAction = useCallback(
    (action: THREE.AnimationAction) => {
      action.enabled = true;
      action.setEffectiveWeight(1);
      action.setEffectiveTimeScale(playbackSpeed);
      action.setLoop(loopEnabled ? THREE.LoopRepeat : THREE.LoopOnce, loopEnabled ? Infinity : 1);
      action.clampWhenFinished = !loopEnabled;
    },
    [loopEnabled, playbackSpeed],
  );

  const stopAll = useCallback(() => {
    clearFadeTimer();
    Object.values(actions).forEach((action) => {
      if (!action) return;
      action.stop();
    });
    currentActionRef.current = null;
    onNowPlayingChange(null);
  }, [actions, clearFadeTimer, onNowPlayingChange]);

  useEffect(() => {
    if (!clipToPlay) {
      stopAll();
      return;
    }

    const nextAction = actions[clipToPlay];
    if (!nextAction) return;

    clearFadeTimer();

    const previousAction = currentActionRef.current;
    configureAction(nextAction);

    if (previousAction && previousAction !== nextAction) {
      previousAction.fadeOut(FADE_SECONDS);
      nextAction.reset();
      nextAction.crossFadeFrom(previousAction, FADE_SECONDS, false);
      nextAction.play();
      const prev = previousAction;
      fadeStopTimerRef.current = window.setTimeout(() => {
        prev.stop();
        fadeStopTimerRef.current = null;
      }, FADE_SECONDS * 1000 + 40);
    } else {
      nextAction.reset();
      nextAction.fadeIn(FADE_SECONDS).play();
    }

    currentActionRef.current = nextAction;
    onNowPlayingChange(clipToPlay);
  }, [actions, clearFadeTimer, clipToPlay, configureAction, onNowPlayingChange, playNonce, stopAll]);

  useEffect(() => {
    const current = currentActionRef.current;
    if (!current) return;
    configureAction(current);
  }, [configureAction]);

  useEffect(() => {
    const onFinished = (event: THREE.Event & { action?: THREE.AnimationAction }) => {
      if (!event.action) return;
      const current = currentActionRef.current;
      if (!current) return;
      if (event.action !== current) return;
      if (loopRef.current) return;
      currentActionRef.current = null;
      onNowPlayingChange(null);
    };

    mixer.addEventListener('finished', onFinished);
    return () => {
      mixer.removeEventListener('finished', onFinished);
    };
  }, [mixer, onNowPlayingChange]);

  useEffect(() => {
    return () => {
      clearFadeTimer();
      Object.values(actions).forEach((action) => action?.stop());
      currentActionRef.current = null;
    };
  }, [actions, clearFadeTimer]);

  return (
    <group ref={groupRef}>
      <group position={transform.centerOffset}>
        <primitive object={scene} />
      </group>
    </group>
  );
}

useGLTF.preload(GLB_PATH);
