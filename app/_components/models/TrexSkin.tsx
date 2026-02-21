'use client';

import { useRef, useEffect, useMemo, useState } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { MODEL_XFORM } from '../../_lib/models';
import { ensureTransparent, setSceneOpacity } from '../../_lib/three/materials';
import { pickClips } from '../../_lib/clips';
import { useStore } from '../../_lib/store';

interface Props {
  opacity: React.MutableRefObject<number>;
  onSceneLoaded?: (scene: THREE.Object3D) => void;
}

export function TrexSkin({ opacity, onSceneLoaded }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF('/models/trex_skin.glb');
  const { actions, mixer } = useAnimations(animations, groupRef);
  const setSkinReady = useStore((s) => s.setSkinReady);
  const setHasRoarClip = useStore((s) => s.setHasRoarClip);
  const roarRequested = useStore((s) => s.roarRequested);
  const clearRoarRequest = useStore((s) => s.clearRoarRequest);
  const mode = useStore((s) => s.mode);
  const audioUnlocked = useStore((s) => s.audioUnlocked);
  const audioUnlockRequested = useStore((s) => s.audioUnlockRequested);
  const clearAudioUnlockRequest = useStore((s) => s.clearAudioUnlockRequest);
  const setAudioUnlocked = useStore((s) => s.setAudioUnlocked);
  const isPlayingRoar = useRef(false);
  const roarAudio = useRef<HTMLAudioElement | null>(null);
  const [audioReady, setAudioReady] = useState(false);

  // Lazily create audio element (client-only)
  useEffect(() => {
    roarAudio.current = new Audio('/audio/trex-roar.m4a');
    roarAudio.current.volume = 0.6;
    setAudioReady(true);
    return () => {
      roarAudio.current = null;
      setAudioReady(false);
    };
  }, []);

  useEffect(() => {
    if (!audioUnlockRequested || !audioReady || !roarAudio.current) return;
    let cancelled = false;

    const unlock = async () => {
      const audio = roarAudio.current;
      if (!audio) return;

      const previousMuted = audio.muted;
      const previousTime = audio.currentTime;
      try {
        audio.muted = true;
        audio.currentTime = 0;
        await audio.play();
        audio.pause();
        audio.currentTime = previousTime;
        audio.muted = previousMuted;
        if (!cancelled) setAudioUnlocked(true);
      } catch {
        if (!cancelled) setAudioUnlocked(false);
      } finally {
        if (!cancelled) clearAudioUnlockRequest();
      }
    };

    unlock();
    return () => {
      cancelled = true;
    };
  }, [audioReady, audioUnlockRequested, clearAudioUnlockRequest, setAudioUnlocked]);

  const clipMap = useMemo(() => {
    const names = animations.map((a) => a.name);
    return pickClips(names);
  }, [animations]);

  // On mount: stop all animations immediately
  useEffect(() => {
    mixer.stopAllAction();
  }, [mixer]);

  // Signal readiness and clip availability
  useEffect(() => {
    ensureTransparent(scene);
    setHasRoarClip(!!clipMap.roar);
    setSkinReady(true);
    onSceneLoaded?.(scene);
  }, [scene, clipMap, setHasRoarClip, setSkinReady, onSceneLoaded]);

  // Stop all actions helper
  const stopAll = () => {
    Object.values(actions).forEach((action) => {
      if (action) {
        action.stop();
      }
    });
    isPlayingRoar.current = false;
  };

  // Idle animation — only when in skin mode
  useEffect(() => {
    if (mode !== 'skin') {
      stopAll();
      return;
    }

    if (!clipMap.idle || !actions[clipMap.idle]) return;
    const idleAction = actions[clipMap.idle]!;
    idleAction.reset().fadeIn(0.3).play();

    return () => {
      idleAction.fadeOut(0.3);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, clipMap.idle, actions]);

  // Roar one-shot — only on explicit button press
  useEffect(() => {
    if (!roarRequested) return;

    clearRoarRequest();

    if (!clipMap.roar || !actions[clipMap.roar] || mode !== 'skin') return;

    const roarAction = actions[clipMap.roar]!;
    const idleAction = clipMap.idle ? actions[clipMap.idle] : null;

    isPlayingRoar.current = true;

    // Play roar sound effect
    if (roarAudio.current) {
      roarAudio.current.currentTime = 0;
      roarAudio.current.play().then(() => {
        if (!audioUnlocked) setAudioUnlocked(true);
      }).catch(() => {});
    }

    if (idleAction) idleAction.fadeOut(0.3);

    roarAction.reset();
    roarAction.setLoop(THREE.LoopOnce, 1);
    roarAction.clampWhenFinished = true;
    roarAction.fadeIn(0.3).play();

    const onFinished = (e: { action: THREE.AnimationAction }) => {
      if (e.action === roarAction) {
        isPlayingRoar.current = false;
        roarAction.fadeOut(0.3);
        if (idleAction && mode === 'skin') {
          idleAction.reset().fadeIn(0.3).play();
        }
        mixer.removeEventListener('finished', onFinished);
      }
    };

    mixer.addEventListener('finished', onFinished);
    return () => {
      mixer.removeEventListener('finished', onFinished);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioUnlocked, roarRequested, setAudioUnlocked]);

  const centerOffset = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const center = box.getCenter(new THREE.Vector3());
    const corr = MODEL_XFORM.skin.centerCorrection ?? [0, 0, 0];
    return [
      -center.x + corr[0],
      -center.y + corr[1],
      -center.z + corr[2],
    ] as [number, number, number];
  }, [scene]);

  // Apply opacity per frame
  useFrame(() => {
    setSceneOpacity(scene, opacity.current);
  });

  const xform = MODEL_XFORM.skin;

  return (
    <group position={xform.position} rotation={xform.rotation} scale={xform.scale}>
      <group ref={groupRef} position={centerOffset}>
        <primitive object={scene} />
      </group>
    </group>
  );
}
