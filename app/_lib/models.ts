export interface ModelTransform {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
}

export const MODEL_XFORM: Record<'skeleton' | 'skin', ModelTransform> = {
  skeleton: {
    position: [0, -0.4, 0],  // offset down to compensate for platform mesh in bounding box
    rotation: [0, 0, 0],
    scale: 1,
  },
  skin: {
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: 10,  // skin body height 1.46 * 10 ≈ skeleton body height 14.58
  },
};
