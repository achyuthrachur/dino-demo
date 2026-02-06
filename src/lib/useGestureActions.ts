// =============================================================================
// useGestureActions Hook - Maps Gestures to Store Actions
// =============================================================================

import { useCallback, useRef } from 'react';
import { useExhibitStore } from './store';
import type { GestureState } from './gestures';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface GestureActionConfig {
  /** Sensitivity for rotation (0-1) */
  rotationSensitivity?: number;
  /** Sensitivity for zoom (0-1) */
  zoomSensitivity?: number;
  /** Minimum confidence to trigger action */
  minConfidence?: number;
}

interface GestureActionHandlers {
  handleGesture: (gesture: GestureState) => void;
  reset: () => void;
}

// -----------------------------------------------------------------------------
// Default Configuration
// -----------------------------------------------------------------------------

const DEFAULT_CONFIG: Required<GestureActionConfig> = {
  rotationSensitivity: 1.0,
  zoomSensitivity: 1.0,
  minConfidence: 0.7,
};

// -----------------------------------------------------------------------------
// Hook Implementation
// -----------------------------------------------------------------------------

export function useGestureActions(
  config: GestureActionConfig = {}
): GestureActionHandlers {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  // Store actions
  const setExplodeFactor = useExhibitStore((state) => state.setExplodeFactor);
  const scanMode = useExhibitStore((state) => state.scanMode);
  const setScanMode = useExhibitStore((state) => state.setScanMode);
  const setAnimationAction = useExhibitStore((state) => state.setAnimationAction);

  // Refs to track state across frames
  const lastZoomValue = useRef<number | null>(null);
  const lastExplodeValue = useRef<number | null>(null);
  const peaceSignCooldown = useRef(false);
  const palmHoldTriggered = useRef(false);

  // Reset tracking refs
  const reset = useCallback(() => {
    lastZoomValue.current = null;
    lastExplodeValue.current = null;
    peaceSignCooldown.current = false;
    palmHoldTriggered.current = false;
  }, []);

  // Main gesture handler
  const handleGesture = useCallback(
    (gesture: GestureState) => {
      // Check minimum confidence
      if (gesture.confidence < mergedConfig.minConfidence) {
        // Reset tracking when no gesture detected
        if (gesture.type === 'none') {
          lastZoomValue.current = null;
          lastExplodeValue.current = null;
          palmHoldTriggered.current = false;

          // Reset peace sign cooldown after no gesture
          if (peaceSignCooldown.current) {
            setTimeout(() => {
              peaceSignCooldown.current = false;
            }, 500);
          }
        }
        return;
      }

      switch (gesture.type) {
        // -----------------------------------------------------------------
        // Pinch & Drag -> Rotate (handled by camera, not store)
        // -----------------------------------------------------------------
        case 'pinch_drag':
          if (gesture.delta) {
            const rotateEvent = new CustomEvent('gesture:rotate', {
              detail: {
                deltaX: gesture.delta.x * mergedConfig.rotationSensitivity,
                deltaY: gesture.delta.y * mergedConfig.rotationSensitivity,
              },
            });
            window.dispatchEvent(rotateEvent);
          }
          break;

        // -----------------------------------------------------------------
        // Two-Hand Pinch Spread -> Zoom
        // -----------------------------------------------------------------
        case 'pinch_spread':
          if (gesture.value !== undefined) {
            // Debug log to calibrate
            if (process.env.NODE_ENV === 'development') {
              // console.log('Zoom Gesture Value:', gesture.value);
            }

            const zoomEvent = new CustomEvent('gesture:zoom', {
              detail: {
                value: gesture.value * mergedConfig.zoomSensitivity,
              },
            });
            window.dispatchEvent(zoomEvent);
            lastZoomValue.current = gesture.value;
          }
          break;

        // -----------------------------------------------------------------
        // Two Open Palms -> Explode/Reassemble
        // -----------------------------------------------------------------
        case 'open_palms':
          if (gesture.value !== undefined) {
            // Apply calibration curve to make it feel better
            // Input 0-1, Output 0-1 but with easing
            const linearValue = gesture.value;
            setExplodeFactor(linearValue);
            lastExplodeValue.current = linearValue;
          }
          break;

        // -----------------------------------------------------------------
        // Palm Hold (1 second) -> Toggle Skin
        // -----------------------------------------------------------------
        case 'palm_hold':
          if (!palmHoldTriggered.current) {
            // Toggle between skeleton and skin
            setScanMode(scanMode === 'skeleton' ? 'skin' : 'skeleton');
            palmHoldTriggered.current = true;
          }
          break;

        // -----------------------------------------------------------------
        // Peace Sign -> Roar (Trigger Animation)
        // -----------------------------------------------------------------
        case 'peace_sign':
          if (!peaceSignCooldown.current) {
            // Trigger Roar
            setAnimationAction('Roar');

            // Reset to Idle after 3 seconds
            setTimeout(() => {
              setAnimationAction('Idle');
            }, 3000);

            peaceSignCooldown.current = true;
            // Longer cooldown for animations
            setTimeout(() => {
              peaceSignCooldown.current = false;
            }, 4000);
          }
          break;

        case 'none':
        default:
          // Reset one-shot triggers when gesture ends
          palmHoldTriggered.current = false;
          break;
      }
    },
    [
      mergedConfig.minConfidence,
      mergedConfig.rotationSensitivity,
      mergedConfig.zoomSensitivity,
      setExplodeFactor,
      scanMode,
      setScanMode,
      setAnimationAction,
    ]
  );

  return {
    handleGesture,
    reset,
  };
}

// -----------------------------------------------------------------------------
// Gesture Event Types (for consumers)
// -----------------------------------------------------------------------------

declare global {
  interface WindowEventMap {
    'gesture:rotate': CustomEvent<{ deltaX: number; deltaY: number }>;
    'gesture:zoom': CustomEvent<{ value: number }>;
  }
}

export type { GestureActionConfig };
