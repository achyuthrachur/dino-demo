'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { animate } from 'animejs';
import * as THREE from 'three';
import { DURATION_MS, EASING, SKIN_REVEAL } from '../_lib/motion';
import { useStore } from '../_lib/store';
import {
  setupSkinClipping,
  removeSkinClipping,
  setSkinRevealProgress,
  hideSkinClipping,
  computeSkinBounds,
  type SkinBounds,
} from '../_lib/three/skinReveal';
import { TrexSkeleton } from './models/TrexSkeleton';
import { TrexSkin } from './models/TrexSkin';
import { ExplodeController } from './ExplodeController';

export function TrexScene() {
  const transitionPhase = useStore((s) => s.transitionPhase);
  const setTransitionPhase = useStore((s) => s.setTransitionPhase);

  // Scene refs for ExplodeController + skin reveal
  const [skeletonScene, setSkeletonScene] = useState<THREE.Object3D | null>(null);
  const [skinScene, setSkinScene] = useState<THREE.Object3D | null>(null);
  const skinBoundsRef = useRef<SkinBounds | null>(null);

  const handleSkeletonLoaded = useCallback((scene: THREE.Object3D) => {
    setSkeletonScene(scene);
  }, []);

  const handleSkinLoaded = useCallback((scene: THREE.Object3D) => {
    setSkinScene(scene);
    skinBoundsRef.current = computeSkinBounds(scene);
  }, []);

  // Opacity refs — mutated by animation, read by model components in useFrame
  const skeletonOpacity = useRef(1);
  const skinOpacity = useRef(0);

  // Anime.js target object for tweening
  const opacityTarget = useRef({ skeleton: 1, skin: 0 });

  // Directional skin reveal transition
  useEffect(() => {
    if (transitionPhase === 'idle') return;

    const toSkin = transitionPhase === 'toSkin';
    const target = opacityTarget.current;
    const bounds = skinBoundsRef.current;

    // If we have skin scene + bounds, use directional clipping reveal
    if (skinScene && bounds && toSkin) {
      // Setup: hide skin via clipping, make it fully opaque
      setupSkinClipping(skinScene);
      hideSkinClipping(bounds);
      skinOpacity.current = 1;
      target.skin = 1;

      const proxy = { progress: 0 };
      animate(proxy, {
        progress: 1,
        duration: DURATION_MS.skinRevealDuration,
        ease: EASING.animeSkinReveal,
        onUpdate: () => {
          setSkinRevealProgress(proxy.progress, bounds);
          // Skeleton trails behind: starts fading at 30% reveal progress
          const skelFade = Math.max(0, (proxy.progress - SKIN_REVEAL.fadeDelay) / (1 - SKIN_REVEAL.fadeDelay));
          skeletonOpacity.current = 1 - skelFade;
          target.skeleton = skeletonOpacity.current;
        },
        onComplete: () => {
          removeSkinClipping(skinScene);
          skeletonOpacity.current = 0;
          target.skeleton = 0;
          setTransitionPhase('idle');
        },
      });
      return;
    }

    // Reverse: skin → skeleton (clipping plane sweeps top → bottom)
    if (skinScene && bounds && !toSkin) {
      setupSkinClipping(skinScene);
      // Start fully revealed
      setSkinRevealProgress(1, bounds);

      const proxy = { progress: 1 };
      animate(proxy, {
        progress: 0,
        duration: DURATION_MS.skinRevealDuration,
        ease: EASING.animeSkinReveal,
        onUpdate: () => {
          setSkinRevealProgress(proxy.progress, bounds);
          // Skeleton fades in as skin disappears
          const skelIn = Math.max(0, (1 - proxy.progress - SKIN_REVEAL.fadeDelay) / (1 - SKIN_REVEAL.fadeDelay));
          skeletonOpacity.current = skelIn;
          target.skeleton = skelIn;
        },
        onComplete: () => {
          removeSkinClipping(skinScene);
          skinOpacity.current = 0;
          target.skin = 0;
          skeletonOpacity.current = 1;
          target.skeleton = 1;
          setTransitionPhase('idle');
        },
      });
      return;
    }

    // Fallback: simple opacity crossfade (no skin scene available yet)
    animate(target, {
      skeleton: toSkin ? 0 : 1,
      skin: toSkin ? 1 : 0,
      duration: DURATION_MS.crossfade,
      ease: EASING.animeStandard,
      onUpdate: () => {
        skeletonOpacity.current = target.skeleton;
        skinOpacity.current = target.skin;
      },
      onComplete: () => {
        setTransitionPhase('idle');
      },
    });
  }, [transitionPhase, setTransitionPhase, skinScene]);

  return (
    <group>
      <TrexSkeleton opacity={skeletonOpacity} onSceneLoaded={handleSkeletonLoaded} />
      <TrexSkin opacity={skinOpacity} onSceneLoaded={handleSkinLoaded} />
      <ExplodeController skeletonScene={skeletonScene} />
    </group>
  );
}
