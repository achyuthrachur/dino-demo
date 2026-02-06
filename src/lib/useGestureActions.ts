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

// Confidence hysteresis thresholds to prevent flickering
const CONFIDENCE_THRESHOLD_ON = 0.75;   // Must exceed this to START gesture
const CONFIDENCE_THRESHOLD_OFF = 0.65;  // Must drop below this to END gesture

// Palm hold requires 1 second of stable detection
const PALM_HOLD_DURATION = 1000;

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
  const cycleScanMode = useExhibitStore((state) => state.cycleScanMode);
  const setAnimationAction = useExhibitStore((state) => state.setAnimationAction);

  // Refs to track state across frames
  const lastZoomValue = useRef<number | null>(null);
  const lastExplodeValue = useRef<number | null>(null);
  const peaceSignCooldown = useRef(false);
  const palmHoldTriggered = useRef(false);

  // Gesture stability tracking
  const activeGestureRef = useRef<string | null>(null);
  const palmHoldTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Reset tracking refs
  const reset = useCallback(() => {
    lastZoomValue.current = null;
    lastExplodeValue.current = null;
    peaceSignCooldown.current = false;
    palmHoldTriggered.current = false;
    activeGestureRef.current = null;
    if (palmHoldTimerRef.current) {
      clearTimeout(palmHoldTimerRef.current);
      palmHoldTimerRef.current = null;
    }
  }, []);

  // Main gesture handler
  const handleGesture = useCallback(
    (gesture: GestureState) => {
      // Log all gestures in dev mode (except 'none')
      if (process.env.NODE_ENV === 'development' && gesture.type !== 'none') {
        console.log('👋 Gesture:', gesture.type, 'Confidence:', gesture.confidence.toFixed(2));
      }

      // Confidence hysteresis to prevent flickering
      const isActive = activeGestureRef.current === gesture.type;

      if (isActive) {
        // Already active - check if should deactivate
        if (gesture.confidence < CONFIDENCE_THRESHOLD_OFF) {
          activeGestureRef.current = null;
          // Clear palm hold timer if gesture lost
          if (palmHoldTimerRef.current) {
            clearTimeout(palmHoldTimerRef.current);
            palmHoldTimerRef.current = null;
          }
          palmHoldTriggered.current = false;
          return; // Cancel gesture
        }
      } else {
        // Not active - check if should activate
        if (gesture.confidence < CONFIDENCE_THRESHOLD_ON) {
          return; // Don't activate yet
        }
        activeGestureRef.current = gesture.type;
      }

      // Legacy fallback for old confidence check
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
        // Palm Hold (1 second) -> Cycle View Mode (mesh → bones → skin → mesh)
        // -----------------------------------------------------------------
        case 'palm_hold':
          if (!palmHoldTriggered.current) {
            // Start timer if not already running
            if (!palmHoldTimerRef.current) {
              console.log('🖐️ Palm hold started - waiting 1s for stable hold...');
              palmHoldTimerRef.current = setTimeout(() => {
                // Cycle through modes after 1 second of stable hold
                cycleScanMode(); // Cycle through: xray → skeleton → skin → xray
                console.log('🔄 Palm hold confirmed! Cycling scan mode');
                palmHoldTriggered.current = true;
                palmHoldTimerRef.current = null;
              }, PALM_HOLD_DURATION);
            }
          }
          break;

        // -----------------------------------------------------------------
        // Peace Sign -> Roar (Trigger Animation)
        // -----------------------------------------------------------------
        case 'peace_sign':
          console.log('✌️ Peace sign detected! Cooldown:', peaceSignCooldown.current);
          if (!peaceSignCooldown.current) {
            // Trigger Roar
            console.log('🦖 Triggering Roar animation');
            setAnimationAction('Roar');

            // Reset to Idle after 5 seconds (increased from 3)
            setTimeout(() => {
              console.log('↩️ Reverting to Idle');
              setAnimationAction('Idle');
            }, 5000);

            peaceSignCooldown.current = true;
            // Cooldown matches animation duration
            setTimeout(() => {
              peaceSignCooldown.current = false;
            }, 5000);
          }
          break;

        case 'none':
        default:
          // Reset one-shot triggers when gesture ends
          palmHoldTriggered.current = false;
          // Clear palm hold timer if gesture lost
          if (palmHoldTimerRef.current) {
            clearTimeout(palmHoldTimerRef.current);
            palmHoldTimerRef.current = null;
          }
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
      cycleScanMode,
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
