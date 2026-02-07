'use client';

import { useRef, useEffect } from 'react';
import { animate } from 'animejs';
import { DURATION_MS, EASING } from '../_lib/motion';
import { useStore } from '../_lib/store';
import { TrexSkeleton } from './models/TrexSkeleton';
import { TrexSkin } from './models/TrexSkin';

export function TrexScene() {
  const transitionPhase = useStore((s) => s.transitionPhase);
  const setTransitionPhase = useStore((s) => s.setTransitionPhase);

  // Opacity refs — mutated by Anime.js, read by model components in useFrame
  const skeletonOpacity = useRef(1);
  const skinOpacity = useRef(0);

  // Anime.js target object for tweening
  const opacityTarget = useRef({ skeleton: 1, skin: 0 });

  // Crossfade animation
  useEffect(() => {
    if (transitionPhase === 'idle') return;

    const toSkin = transitionPhase === 'toSkin';
    const target = opacityTarget.current;

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
  }, [transitionPhase, setTransitionPhase]);

  return (
    <group>
      <TrexSkeleton opacity={skeletonOpacity} />
      <TrexSkin opacity={skinOpacity} />
    </group>
  );
}
