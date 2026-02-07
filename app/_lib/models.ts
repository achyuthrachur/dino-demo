export interface ModelTransform {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
}

export const MODEL_XFORM: Record<'skeleton' | 'skin', ModelTransform> = {
  skeleton: {
    position: [0, -6, 0],
    rotation: [0, 0, 0],
    scale: 1.15,
  },
  skin: {
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: 5,
  },
};
