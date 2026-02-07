export interface ModelTransform {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
}

export const MODEL_XFORM: Record<'skeleton' | 'skin', ModelTransform> = {
  skeleton: {
    position: [0, -2, 0],   // was -6, raised to center in viewport
    rotation: [0, 0, 0],
    scale: 1.15,
  },
  skin: {
    position: [0, 1, 0],    // was 0, nudged up slightly
    rotation: [0, 0, 0],
    scale: 5,
  },
};
