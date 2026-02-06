// =============================================================================
// Gesture Recognition System using MediaPipe Tasks Vision
// =============================================================================

import {
  HandLandmarker,
  FilesetResolver,
  HandLandmarkerResult,
} from '@mediapipe/tasks-vision';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type GestureType =
  | 'pinch_drag' // One-hand pinch & drag -> Rotate
  | 'pinch_spread' // Two-hand pinch & spread -> Zoom
  | 'open_palms' // Two-hand open palms -> Explode/Reassemble
  | 'closed_fists' // Two closed fists moving together -> Pan
  | 'palm_hold' // Open palm hold 1s -> Toggle callouts
  | 'peace_sign' // V sign -> Cycle scan mode
  | 'none';

export interface GestureState {
  type: GestureType;
  confidence: number;
  /** Normalized value 0-1 for gestures with magnitude (zoom, explode) */
  value?: number;
  /** Delta movement for rotation gestures */
  delta?: { x: number; y: number };
  /** Number of hands detected */
  handCount: number;
}

export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

export interface DetectedHand {
  landmarks: HandLandmark[];
  worldLandmarks: HandLandmark[];
  handedness: 'Left' | 'Right';
  score: number;
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

/** Dead zone threshold for gesture stability */
export const GESTURE_DEADZONE = 0.05;

/** Time in ms to hold palm for toggle action */
export const GESTURE_HOLD_TIME = 1000;

/** Smoothing factor for gesture values (0-1, lower = more smoothing) */
export const SMOOTHING_FACTOR = 0.3;

/** Minimum confidence to consider a gesture valid */
export const MIN_CONFIDENCE = 0.7;

/** Landmark indices for MediaPipe hand model */
export const LANDMARKS = {
  WRIST: 0,
  THUMB_CMC: 1,
  THUMB_MCP: 2,
  THUMB_IP: 3,
  THUMB_TIP: 4,
  INDEX_MCP: 5,
  INDEX_PIP: 6,
  INDEX_DIP: 7,
  INDEX_TIP: 8,
  MIDDLE_MCP: 9,
  MIDDLE_PIP: 10,
  MIDDLE_DIP: 11,
  MIDDLE_TIP: 12,
  RING_MCP: 13,
  RING_PIP: 14,
  RING_DIP: 15,
  RING_TIP: 16,
  PINKY_MCP: 17,
  PINKY_PIP: 18,
  PINKY_DIP: 19,
  PINKY_TIP: 20,
} as const;

/** Hand connection pairs for drawing */
export const HAND_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8], // Index
  [0, 9], [9, 10], [10, 11], [11, 12], // Middle
  [0, 13], [13, 14], [14, 15], [15, 16], // Ring
  [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
  [5, 9], [9, 13], [13, 17], // Palm
];

// -----------------------------------------------------------------------------
// Gesture Recognizer Class
// -----------------------------------------------------------------------------

export class GestureRecognizer {
  private handLandmarker: HandLandmarker | null = null;
  private isInitialized = false;
  private lastGestureState: GestureState = { type: 'none', confidence: 0, handCount: 0 };
  private palmHoldStart: number | null = null;
  private lastPinchPosition: { x: number; y: number } | null = null;
  private smoothedValue = 0;
  private lastFistCenter: { x: number; y: number } | null = null;

  /**
   * Initialize MediaPipe HandLandmarker
   */
  async initialize(): Promise<boolean> {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('[Gestures] Initializing MediaPipe...');
      }

      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );

      this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: 2,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      this.isInitialized = true;
      if (process.env.NODE_ENV === 'development') {
        console.log('[Gestures] MediaPipe initialized successfully');
      }
      return true;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[Gestures] Failed to initialize MediaPipe:', error);
      }
      return false;
    }
  }

  /**
   * Process a video frame and detect hands
   */
  detectHands(video: HTMLVideoElement, timestamp: number): DetectedHand[] {
    if (!this.handLandmarker || !this.isInitialized) {
      return [];
    }

    try {
      const result: HandLandmarkerResult = this.handLandmarker.detectForVideo(
        video,
        timestamp
      );

      if (!result.landmarks || result.landmarks.length === 0) {
        return [];
      }

      return result.landmarks.map((landmarks, index) => ({
        landmarks: landmarks.map((l) => ({ x: l.x, y: l.y, z: l.z })),
        worldLandmarks: result.worldLandmarks[index]?.map((l) => ({
          x: l.x,
          y: l.y,
          z: l.z,
        })) || [],
        handedness: (result.handednesses[index]?.[0]?.categoryName as 'Left' | 'Right') || 'Right',
        score: result.handednesses[index]?.[0]?.score || 0,
      }));
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[Gestures] Detection error:', error);
      }
      return [];
    }
  }

  /**
   * Recognize gesture from detected hands
   */
  recognizeGesture(hands: DetectedHand[]): GestureState {
    if (hands.length === 0) {
      this.palmHoldStart = null;
      this.lastPinchPosition = null;
      return { type: 'none', confidence: 0, handCount: 0 };
    }

    const handCount = hands.length;

    // Two-hand gestures
    if (hands.length === 2) {
      // Check for two-hand pinch spread (zoom)
      const pinchSpread = this.detectTwoHandPinchSpread(hands);
      if (pinchSpread.detected) {
        this.palmHoldStart = null;
        return {
          type: 'pinch_spread',
          confidence: pinchSpread.confidence,
          value: this.smoothValue(pinchSpread.value),
          handCount,
        };
      }

      // Check for two open palms (explode)
      const openPalms = this.detectTwoOpenPalms(hands);
      if (openPalms.detected) {
        this.palmHoldStart = null;
        this.lastFistCenter = null;
        return {
          type: 'open_palms',
          confidence: openPalms.confidence,
          value: this.smoothValue(openPalms.value),
          handCount,
        };
      }

      // Check for two closed fists (pan)
      const closedFists = this.detectTwoClosedFists(hands);
      if (closedFists.detected) {
        this.palmHoldStart = null;
        return {
          type: 'closed_fists',
          confidence: closedFists.confidence,
          delta: closedFists.delta,
          handCount,
        };
      }
    }

    // Single hand gestures
    const hand = hands[0];

    // Check for peace sign (V)
    const peaceSign = this.detectPeaceSign(hand);
    if (peaceSign.detected) {
      this.palmHoldStart = null;
      this.lastPinchPosition = null;
      return {
        type: 'peace_sign',
        confidence: peaceSign.confidence,
        handCount,
      };
    }

    // Check for pinch drag (rotate)
    const pinchDrag = this.detectPinchDrag(hand);
    if (pinchDrag.detected) {
      this.palmHoldStart = null;
      return {
        type: 'pinch_drag',
        confidence: pinchDrag.confidence,
        delta: pinchDrag.delta,
        handCount,
      };
    }

    // Check for open palm hold (toggle callouts)
    const openPalm = this.detectOpenPalm(hand);
    if (openPalm.detected) {
      const now = Date.now();
      if (this.palmHoldStart === null) {
        this.palmHoldStart = now;
      } else if (now - this.palmHoldStart >= GESTURE_HOLD_TIME) {
        this.palmHoldStart = null; // Reset after trigger
        return {
          type: 'palm_hold',
          confidence: openPalm.confidence,
          handCount,
        };
      }
      // Still holding, return the gesture state but not triggered yet
      return {
        type: 'none',
        confidence: openPalm.confidence * ((now - this.palmHoldStart) / GESTURE_HOLD_TIME),
        handCount,
      };
    }

    this.palmHoldStart = null;
    this.lastPinchPosition = null;
    return { type: 'none', confidence: 0, handCount };
  }

  /**
   * Detect pinch gesture (thumb tip close to index tip)
   */
  private detectPinch(hand: DetectedHand): { detected: boolean; position: { x: number; y: number }; confidence: number } {
    const thumbTip = hand.landmarks[LANDMARKS.THUMB_TIP];
    const indexTip = hand.landmarks[LANDMARKS.INDEX_TIP];

    const distance = Math.sqrt(
      Math.pow(thumbTip.x - indexTip.x, 2) +
      Math.pow(thumbTip.y - indexTip.y, 2) +
      Math.pow(thumbTip.z - indexTip.z, 2)
    );

    const pinchThreshold = 0.08;
    const detected = distance < pinchThreshold;
    const confidence = detected ? Math.max(0, 1 - distance / pinchThreshold) : 0;

    const position = {
      x: (thumbTip.x + indexTip.x) / 2,
      y: (thumbTip.y + indexTip.y) / 2,
    };

    return { detected, position, confidence };
  }

  /**
   * Detect pinch and drag gesture for rotation
   */
  private detectPinchDrag(hand: DetectedHand): { detected: boolean; delta: { x: number; y: number }; confidence: number } {
    const pinch = this.detectPinch(hand);

    if (!pinch.detected) {
      this.lastPinchPosition = null;
      return { detected: false, delta: { x: 0, y: 0 }, confidence: 0 };
    }

    let delta = { x: 0, y: 0 };

    if (this.lastPinchPosition) {
      delta = {
        x: (pinch.position.x - this.lastPinchPosition.x) * 2,
        y: (pinch.position.y - this.lastPinchPosition.y) * 2,
      };

      // Apply dead zone
      if (Math.abs(delta.x) < GESTURE_DEADZONE) delta.x = 0;
      if (Math.abs(delta.y) < GESTURE_DEADZONE) delta.y = 0;
    }

    this.lastPinchPosition = pinch.position;

    return {
      detected: true,
      delta,
      confidence: pinch.confidence,
    };
  }

  /**
   * Detect two-hand pinch spread for zoom
   */
  private detectTwoHandPinchSpread(hands: DetectedHand[]): { detected: boolean; value: number; confidence: number } {
    const pinch1 = this.detectPinch(hands[0]);
    const pinch2 = this.detectPinch(hands[1]);

    if (!pinch1.detected || !pinch2.detected) {
      return { detected: false, value: 0.5, confidence: 0 };
    }

    // Calculate distance between the two pinch points
    const distance = Math.sqrt(
      Math.pow(pinch1.position.x - pinch2.position.x, 2) +
      Math.pow(pinch1.position.y - pinch2.position.y, 2)
    );

    // Normalize distance to 0-1 range (assuming max spread is about 0.8 of screen width)
    const normalizedDistance = Math.min(1, Math.max(0, distance / 0.8));

    return {
      detected: true,
      value: normalizedDistance,
      confidence: (pinch1.confidence + pinch2.confidence) / 2,
    };
  }

  /**
   * Detect if hand is an open palm
   */
  private detectOpenPalm(hand: DetectedHand): { detected: boolean; confidence: number } {
    // Check if all fingers are extended (tips above PIPs)
    const fingersExtended = [
      hand.landmarks[LANDMARKS.INDEX_TIP].y < hand.landmarks[LANDMARKS.INDEX_PIP].y,
      hand.landmarks[LANDMARKS.MIDDLE_TIP].y < hand.landmarks[LANDMARKS.MIDDLE_PIP].y,
      hand.landmarks[LANDMARKS.RING_TIP].y < hand.landmarks[LANDMARKS.RING_PIP].y,
      hand.landmarks[LANDMARKS.PINKY_TIP].y < hand.landmarks[LANDMARKS.PINKY_PIP].y,
    ];

    // Thumb check is different (horizontal)
    const thumbExtended =
      Math.abs(hand.landmarks[LANDMARKS.THUMB_TIP].x - hand.landmarks[LANDMARKS.THUMB_MCP].x) > 0.05;

    const allExtended = fingersExtended.every((e) => e) && thumbExtended;
    const extendedCount = fingersExtended.filter((e) => e).length + (thumbExtended ? 1 : 0);

    return {
      detected: allExtended,
      confidence: extendedCount / 5,
    };
  }

  /**
   * Detect two open palms for explode gesture
   */
  private detectTwoOpenPalms(hands: DetectedHand[]): { detected: boolean; value: number; confidence: number } {
    const palm1 = this.detectOpenPalm(hands[0]);
    const palm2 = this.detectOpenPalm(hands[1]);

    if (!palm1.detected || !palm2.detected) {
      return { detected: false, value: 0, confidence: 0 };
    }

    // Calculate distance between wrists (palm centers)
    const wrist1 = hands[0].landmarks[LANDMARKS.WRIST];
    const wrist2 = hands[1].landmarks[LANDMARKS.WRIST];

    const distance = Math.sqrt(
      Math.pow(wrist1.x - wrist2.x, 2) + Math.pow(wrist1.y - wrist2.y, 2)
    );

    // Normalize: wider apart = more exploded
    // Adjusted for natural arm span: min ~0.2, max ~0.7
    const normalizedValue = Math.min(1, Math.max(0, (distance - 0.2) / 0.5));

    return {
      detected: true,
      value: normalizedValue,
      confidence: (palm1.confidence + palm2.confidence) / 2,
    };
  }

  /**
   * Detect if hand is a closed fist (all fingers curled)
   */
  private detectClosedFist(hand: DetectedHand): { detected: boolean; confidence: number } {
    const landmarks = hand.landmarks;

    // All four fingers should be curled (tips below PIPs)
    const fingersCurled = [
      landmarks[LANDMARKS.INDEX_TIP].y > landmarks[LANDMARKS.INDEX_PIP].y,
      landmarks[LANDMARKS.MIDDLE_TIP].y > landmarks[LANDMARKS.MIDDLE_PIP].y,
      landmarks[LANDMARKS.RING_TIP].y > landmarks[LANDMARKS.RING_PIP].y,
      landmarks[LANDMARKS.PINKY_TIP].y > landmarks[LANDMARKS.PINKY_PIP].y,
    ];

    // Thumb should be curled in (close to palm)
    const thumbCurled =
      Math.abs(landmarks[LANDMARKS.THUMB_TIP].x - landmarks[LANDMARKS.THUMB_MCP].x) < 0.06;

    const allCurled = fingersCurled.every((c) => c) && thumbCurled;
    const curledCount = fingersCurled.filter((c) => c).length + (thumbCurled ? 1 : 0);

    return {
      detected: allCurled,
      confidence: curledCount / 5,
    };
  }

  /**
   * Detect two closed fists moving together for pan gesture
   */
  private detectTwoClosedFists(hands: DetectedHand[]): { detected: boolean; delta: { x: number; y: number }; confidence: number } {
    const fist1 = this.detectClosedFist(hands[0]);
    const fist2 = this.detectClosedFist(hands[1]);

    if (!fist1.detected || !fist2.detected) {
      this.lastFistCenter = null;
      return { detected: false, delta: { x: 0, y: 0 }, confidence: 0 };
    }

    // Calculate midpoint between the two wrists
    const wrist1 = hands[0].landmarks[LANDMARKS.WRIST];
    const wrist2 = hands[1].landmarks[LANDMARKS.WRIST];
    const center = {
      x: (wrist1.x + wrist2.x) / 2,
      y: (wrist1.y + wrist2.y) / 2,
    };

    let delta = { x: 0, y: 0 };

    if (this.lastFistCenter) {
      delta = {
        x: (center.x - this.lastFistCenter.x) * -3, // Inverted X for mirrored video
        y: (center.y - this.lastFistCenter.y) * 3,
      };

      // Apply dead zone
      if (Math.abs(delta.x) < GESTURE_DEADZONE) delta.x = 0;
      if (Math.abs(delta.y) < GESTURE_DEADZONE) delta.y = 0;
    }

    this.lastFistCenter = center;

    return {
      detected: true,
      delta,
      confidence: (fist1.confidence + fist2.confidence) / 2,
    };
  }

  /**
   * Detect peace sign (V gesture) - index and middle up, others down
   */
  private detectPeaceSign(hand: DetectedHand): { detected: boolean; confidence: number } {
    const landmarks = hand.landmarks;

    // Index and middle should be extended
    const indexExtended = landmarks[LANDMARKS.INDEX_TIP].y < landmarks[LANDMARKS.INDEX_PIP].y;
    const middleExtended = landmarks[LANDMARKS.MIDDLE_TIP].y < landmarks[LANDMARKS.MIDDLE_PIP].y;

    // Ring and pinky should be curled
    const ringCurled = landmarks[LANDMARKS.RING_TIP].y > landmarks[LANDMARKS.RING_PIP].y;
    const pinkyCurled = landmarks[LANDMARKS.PINKY_TIP].y > landmarks[LANDMARKS.PINKY_PIP].y;

    // Thumb can be either way
    const detected = indexExtended && middleExtended && ringCurled && pinkyCurled;

    // Additional check: index and middle should be spread apart
    const fingerSpread = Math.abs(
      landmarks[LANDMARKS.INDEX_TIP].x - landmarks[LANDMARKS.MIDDLE_TIP].x
    );
    const spreadEnough = fingerSpread > 0.03;

    return {
      detected: detected && spreadEnough,
      confidence: detected && spreadEnough ? 0.9 : 0,
    };
  }

  /**
   * Smooth value changes to prevent jitter
   */
  private smoothValue(value: number): number {
    this.smoothedValue = this.smoothedValue * (1 - SMOOTHING_FACTOR) + value * SMOOTHING_FACTOR;
    return this.smoothedValue;
  }

  /**
   * Check if initialized
   */
  get initialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    if (this.handLandmarker) {
      this.handLandmarker.close();
      this.handLandmarker = null;
    }
    this.isInitialized = false;
  }
}

// -----------------------------------------------------------------------------
// Singleton Instance
// -----------------------------------------------------------------------------

let gestureRecognizerInstance: GestureRecognizer | null = null;

export function getGestureRecognizer(): GestureRecognizer {
  if (!gestureRecognizerInstance) {
    gestureRecognizerInstance = new GestureRecognizer();
  }
  return gestureRecognizerInstance;
}

// -----------------------------------------------------------------------------
// Legacy exports for backward compatibility
// -----------------------------------------------------------------------------

export async function initGestureRecognition(): Promise<boolean> {
  return getGestureRecognizer().initialize();
}

export function detectGesture(hands: DetectedHand[]): GestureState {
  return getGestureRecognizer().recognizeGesture(hands);
}
