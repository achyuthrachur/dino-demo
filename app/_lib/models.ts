export interface ModelTransform {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  /** Optional correction applied to inner centering group (in scaled local space) */
  centerCorrection?: [number, number, number];
}

export const MODEL_XFORM: Record<'skeleton' | 'skin', ModelTransform> = {
  skeleton: {
    position: [2, 1, 0],
    rotation: [0, 0, 0],
    scale: 1.15,
  },
  skin: {
    position: [2, 1, 0],
    rotation: [0, 0, 0],
    scale: 5.74,
    // Correction to align skin BBox center with skeleton BBox center
    // Applied in raw scene units (gets scaled by outer group)
    // Measured delta: skin is +0.459 Y, +0.861 Z vs skeleton → correct by -0.08, -0.15
    centerCorrection: [0, -0.08, -0.15],
  },
};
