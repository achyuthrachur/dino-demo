export interface ModelTransform {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
}

export const MODEL_XFORM: Record<'skeleton' | 'skin', ModelTransform> = {
  skeleton: {
    position: [0, -1.5, 0],
    rotation: [0, 0, 0],
    scale: 1,
  },
  skin: {
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: 6,
  },
};
