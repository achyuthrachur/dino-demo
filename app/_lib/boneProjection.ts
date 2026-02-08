/**
 * Shared mutable ref for bone → screen projection.
 * BoneProjector (R3F) writes, AnnotationLines (HTML) reads.
 * Module-level object — no React state, zero overhead.
 */

export interface ProjectedPoint {
  x: number;
  y: number;
  visible: boolean;
}

export const projectedAnchor: ProjectedPoint = { x: 0, y: 0, visible: false };
