'use client';

import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { useStore } from '@/app/_lib/store';
import { useDirector } from '@/app/_lib/director';
import { getLatestHands, startHandTracker, stopHandTracker } from '@/app/_lib/gesture/handTracker';
import { classifyGesture, resetRecognizers } from '@/app/_lib/gesture/recognizers';
import { GestureSmoother } from '@/app/_lib/gesture/smoother';
import { applyGestureToCamera } from '@/app/_lib/gesture/mapper';

export function GestureController() {
  const { camera } = useThree();
  const smoother = useRef(new GestureSmoother());
  const controlsDisabledByUs = useRef(false);

  // Handle enable/disable of hand tracker
  useEffect(() => {
    let prevEnabled = useStore.getState().gestureEnabled;

    const unsub = useStore.subscribe((state) => {
      const enabled = state.gestureEnabled;
      if (enabled === prevEnabled) return;
      prevEnabled = enabled;

      if (enabled) {
        startHandTracker().catch((err) => {
          console.warn('[GestureController] Failed to start hand tracker:', err);
          useStore.getState().showToast('Camera permission denied');
          useStore.getState().setGestureEnabled(false);
        });
      } else {
        stopHandTracker();
        resetRecognizers();
        smoother.current.reset();

        // Re-enable OrbitControls if we disabled them
        if (controlsDisabledByUs.current) {
          const ctrl = useDirector.getState()._controlsRef;
          if (ctrl) ctrl.enabled = true;
          controlsDisabledByUs.current = false;
        }

        useStore.getState().setGestureKind('none');
        useStore.getState().setGestureConfidence(0);
      }
    });

    return () => {
      unsub();
      stopHandTracker();
    };
  }, []);

  useFrame(() => {
    const store = useStore.getState();
    if (!store.gestureEnabled) return;

    const director = useDirector.getState();

    // Respect director choreography
    if (director.phase === 'busy') return;

    // Respect mode transition
    if (store.transitionPhase !== 'idle') return;

    const controls = director._controlsRef;
    if (!controls) return;

    const hands = getLatestHands();
    const raw = classifyGesture(hands);
    const smoothed = smoother.current.update(raw);

    if (smoothed.kind !== 'none') {
      // Take control from OrbitControls
      if (controls.enabled) {
        controls.enabled = false;
        controlsDisabledByUs.current = true;
      }
      applyGestureToCamera(smoothed, camera, controls);
    } else if (controlsDisabledByUs.current) {
      // Release back to OrbitControls
      controls.enabled = true;
      controlsDisabledByUs.current = false;
    }

    // Update store for UI
    store.setGestureKind(smoothed.kind);
    store.setGestureConfidence(smoothed.confidence);
  });

  return null;
}
