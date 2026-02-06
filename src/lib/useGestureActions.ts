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
  const cycleScanMode = useExhibitStore((state) => state.cycleScanMode);
  const toggleCallouts = useExhibitStore((state) => state.toggleCallouts);
  const setAnimationAction = useExhibitStore((state) => state.setAnimationAction);

  // Refs to track state across frames
  const lastZoomValue = useRef<number | null>(null);
  const lastExplodeValue = useRef<number | null>(null);
  const peaceSignCooldown = useRef(false);
  const palmHoldTriggered = useRef(false);
  const roarTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        // The delta values can be used by the camera rig if needed
        // -----------------------------------------------------------------
        case 'pinch_drag':
          // Rotation is typically handled in the 3D scene itself
          // Could dispatch to a custom event or context if needed
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
            // Map gesture value (0-1) to zoom
            // We use explodeFactor for now as a proxy for zoom
            // In a real implementation, this would control camera distance
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
            // Map palm distance to explode factor
            // Closer palms = less exploded, farther = more exploded
            const explodeFactor = gesture.value;
            setExplodeFactor(explodeFactor);
            lastExplodeValue.current = explodeFactor;
          }
          break;

        // -----------------------------------------------------------------
        // Palm Hold (1 second) -> Toggle Callouts
        // -----------------------------------------------------------------
        case 'palm_hold':
          if (!palmHoldTriggered.current) {
            toggleCallouts();
            palmHoldTriggered.current = true;
          }
          break;

        // -----------------------------------------------------------------
        // Two Closed Fists -> Pan
        // -----------------------------------------------------------------
        case 'closed_fists':
          if (gesture.delta) {
            const panEvent = new CustomEvent('gesture:pan', {
              detail: {
                deltaX: gesture.delta.x,
                deltaY: gesture.delta.y,
              },
            });
            window.dispatchEvent(panEvent);
          }
          break;

        // -----------------------------------------------------------------
        // Peace Sign -> Trigger Roar Animation (5 sec then revert to Idle)
        // -----------------------------------------------------------------
        case 'peace_sign':
          if (!peaceSignCooldown.current) {
            setAnimationAction('Roar');
            peaceSignCooldown.current = true;

            // Clear any existing roar timeout
            if (roarTimeoutRef.current) clearTimeout(roarTimeoutRef.current);

            // Revert to Idle after 5 seconds
            roarTimeoutRef.current = setTimeout(() => {
              setAnimationAction('Idle');
              peaceSignCooldown.current = false;
              roarTimeoutRef.current = null;
            }, 5000);
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
      cycleScanMode,
      toggleCallouts,
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
    'gesture:pan': CustomEvent<{ deltaX: number; deltaY: number }>;
  }
}

export type { GestureActionConfig };
