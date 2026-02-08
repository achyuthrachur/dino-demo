import type { SegmentId } from './director';

/**
 * Maps each segment to its root bone name(s) in the skeleton.
 * All child bones inherit the offset from the root.
 */
export const SEGMENT_BONES: Record<Exclude<SegmentId, 'platform'>, string> = {
  skull: 'Cabeza_Armature.Rexy',
  neck: 'Cuello_Armature.Rexy',
  chest: 'Pecho_Armature.Rexy',
  arm_l: 'Clavicula.L_Armature.Rexy',
  arm_r: 'Clavicula.R_Armature.Rexy',
  pelvis: 'Pelvis_Armature.Rexy',
  tail: 'Cola.1_Armature.Rexy',
  leg_l: 'Muslo.L_Armature.Rexy',
  leg_r: 'Muslo.R_Armature.Rexy',
};

/**
 * Explode direction for each segment (unit vectors, will be normalized at init).
 * [x, y, z] — right/left, up/down, forward/back
 */
export const SEGMENT_DIRECTIONS: Record<Exclude<SegmentId, 'platform'>, [number, number, number]> = {
  skull: [0, 0.6, 1],      // up + forward
  neck: [0, 0.8, 0.3],     // mostly up
  chest: [0, 0.3, 0],      // slightly up
  arm_l: [-1, 0, 0.3],     // left + slight out
  arm_r: [1, 0, 0.3],      // right + slight out
  pelvis: [0, -0.3, 0],    // slightly down
  tail: [0, 0, -1],        // back
  leg_l: [-0.5, -0.7, 0],  // left + down
  leg_r: [0.5, -0.7, 0],   // right + down
};

/** Maximum explode distance in world units */
export const EXPLODE_MAX_DISTANCE = 5.0;

/** Per-segment weight presets for chapters */
export type SegmentWeights = Record<SegmentId, number>;

export function allWeights(v: number): SegmentWeights {
  return {
    skull: v,
    neck: v,
    chest: v,
    arm_l: v,
    arm_r: v,
    pelvis: v,
    tail: v,
    leg_l: v,
    leg_r: v,
    platform: v,
  };
}

export function chapterWeights(overrides: Partial<SegmentWeights>): SegmentWeights {
  return { ...allWeights(0.3), ...overrides };
}
