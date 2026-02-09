export type GestureKind = 'none' | 'rotate' | 'pan' | 'zoom';

export interface HandLandmarks {
  landmarks: Array<{ x: number; y: number; z: number }>;
  worldLandmarks: Array<{ x: number; y: number; z: number }>;
  handedness: 'Left' | 'Right';
  confidence: number;
}

export interface GestureState {
  kind: GestureKind;
  confidence: number;
  // Normalized deltas per frame (–1…+1 range)
  dx: number;
  dy: number;
  // For zoom: spread delta
  dz: number;
}

export const EMPTY_GESTURE: GestureState = {
  kind: 'none',
  confidence: 0,
  dx: 0,
  dy: 0,
  dz: 0,
};
