import type { HandLandmarks, GestureState } from './config';
import { EMPTY_GESTURE } from './config';
import { INPUT } from '../motion';

// Landmark indices
const THUMB_TIP = 4;
const INDEX_TIP = 8;
const MIDDLE_TIP = 12;
const RING_TIP = 16;
const PINKY_TIP = 20;
const INDEX_MCP = 5;
const MIDDLE_MCP = 9;
const RING_MCP = 13;
const PINKY_MCP = 17;
const WRIST = 0;

// Previous frame state for computing deltas
let prevPinchMidpoint: { x: number; y: number } | null = null;
let prevPalmCenter: { x: number; y: number } | null = null;
let prevZoomSpread: number | null = null;

function dist2d(
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function isPinching(hand: HandLandmarks): boolean {
  const thumb = hand.landmarks[THUMB_TIP];
  const index = hand.landmarks[INDEX_TIP];
  return dist2d(thumb, index) < INPUT.pinchThreshold;
}

function isOpenPalm(hand: HandLandmarks): boolean {
  const tips = [INDEX_TIP, MIDDLE_TIP, RING_TIP, PINKY_TIP];
  const mcps = [INDEX_MCP, MIDDLE_MCP, RING_MCP, PINKY_MCP];
  let extended = 0;
  for (let i = 0; i < tips.length; i++) {
    if (hand.landmarks[tips[i]].y < hand.landmarks[mcps[i]].y) {
      extended++;
    }
  }
  return extended >= 3;
}

function pinchMidpoint(hand: HandLandmarks): { x: number; y: number } {
  const thumb = hand.landmarks[THUMB_TIP];
  const index = hand.landmarks[INDEX_TIP];
  return { x: (thumb.x + index.x) / 2, y: (thumb.y + index.y) / 2 };
}

function palmCenter(hand: HandLandmarks): { x: number; y: number } {
  const w = hand.landmarks[WRIST];
  const m = hand.landmarks[MIDDLE_MCP];
  return { x: (w.x + m.x) / 2, y: (w.y + m.y) / 2 };
}

export function classifyGesture(hands: HandLandmarks[]): GestureState {
  // 2 hands visible → ZOOM (spread/pinch palm centers)
  if (hands.length >= 2) {
    const center0 = palmCenter(hands[0]);
    const center1 = palmCenter(hands[1]);
    const spread = dist2d(center0, center1);

    let dz = 0;
    if (prevZoomSpread !== null) {
      dz = spread - prevZoomSpread;
    }
    prevZoomSpread = spread;
    prevPinchMidpoint = null;
    prevPalmCenter = null;

    const avgConf = (hands[0].confidence + hands[1].confidence) / 2;
    return { kind: 'zoom', confidence: avgConf, dx: 0, dy: 0, dz };
  }

  prevZoomSpread = null;

  if (hands.length >= 1) {
    const hand = hands[0];

    // 1 hand + pinch → ROTATE
    if (isPinching(hand)) {
      const mid = pinchMidpoint(hand);
      let dx = 0;
      let dy = 0;
      if (prevPinchMidpoint !== null) {
        dx = mid.x - prevPinchMidpoint.x;
        dy = mid.y - prevPinchMidpoint.y;
      }
      prevPinchMidpoint = mid;
      prevPalmCenter = null;

      return { kind: 'rotate', confidence: hand.confidence, dx, dy, dz: 0 };
    }

    prevPinchMidpoint = null;

    // 1 hand + open palm → PAN
    if (isOpenPalm(hand)) {
      const center = palmCenter(hand);
      let dx = 0;
      let dy = 0;
      if (prevPalmCenter !== null) {
        dx = center.x - prevPalmCenter.x;
        dy = center.y - prevPalmCenter.y;
      }
      prevPalmCenter = center;

      return { kind: 'pan', confidence: hand.confidence, dx, dy, dz: 0 };
    }

    prevPalmCenter = null;
  }

  // No gesture detected — reset all
  prevPinchMidpoint = null;
  prevPalmCenter = null;
  prevZoomSpread = null;

  return { ...EMPTY_GESTURE };
}

export function resetRecognizers(): void {
  prevPinchMidpoint = null;
  prevPalmCenter = null;
  prevZoomSpread = null;
}
