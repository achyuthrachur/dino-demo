export interface ModelTransform {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
}

export const MODEL_XFORM: Record<'skeleton' | 'skin', ModelTransform> = {
  skeleton: {
    position: [2, 1, 0],
    rotation: [0, 0, 0],
    scale: 1.15,
  },
  skin: {
    position: [2, 1.5, 0],
    rotation: [0, 0, 0],
    scale: 5,
  },
};
