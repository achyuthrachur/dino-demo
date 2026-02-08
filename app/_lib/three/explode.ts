import * as THREE from 'three';
import { SEGMENT_BONES, SEGMENT_DIRECTIONS, EXPLODE_MAX_DISTANCE } from '../explodePresets';
import type { SegmentId } from '../director';

interface SegmentState {
  bone: THREE.Bone;
  restPosition: THREE.Vector3;
  direction: THREE.Vector3; // normalized world-space direction
}

export interface ExplodeState {
  segments: Map<Exclude<SegmentId, 'platform'>, SegmentState>;
  platformMesh: THREE.Object3D | null;
  platformRestY: number;
  ready: boolean;
}

// Pre-allocate vectors to avoid per-frame GC
const _offset = new THREE.Vector3();
const _worldPos = new THREE.Vector3();
const _parentWorld = new THREE.Matrix4();

/**
 * Scans the skeleton scene for segment root bones and caches rest state.
 * Call once after the skeleton GLB is loaded.
 */
export function initExplodeState(scene: THREE.Object3D): ExplodeState {
  const segments = new Map<Exclude<SegmentId, 'platform'>, SegmentState>();
  let platformMesh: THREE.Object3D | null = null;
  let platformRestY = 0;

  // Collect all bones by name for lookup
  const boneMap = new Map<string, THREE.Bone>();
  scene.traverse((child) => {
    // Strategy 1: Extract bones from SkinnedMesh skeleton (most robust)
    if ((child as THREE.SkinnedMesh).isSkinnedMesh) {
      const skinned = child as THREE.SkinnedMesh;
      if (skinned.skeleton?.bones) {
        for (const bone of skinned.skeleton.bones) {
          if (bone.name && !boneMap.has(bone.name)) {
            boneMap.set(bone.name, bone);
          }
        }
      }
    }
    // Strategy 2: Direct type check (aligns with DevPanel)
    if (child.type === 'Bone' && child.name && !boneMap.has(child.name)) {
      boneMap.set(child.name, child as THREE.Bone);
    }
    if (child.name === 'platform_0' && child instanceof THREE.Mesh) {
      platformMesh = child;
      platformRestY = child.position.y;
    }
  });

  // Log available bones for debugging
  if (typeof window !== 'undefined') {
    console.log('[Explode] Available bones:', Array.from(boneMap.keys()));
  }

  const segmentIds = Object.keys(SEGMENT_BONES) as Exclude<SegmentId, 'platform'>[];

  for (const segId of segmentIds) {
    const boneName = SEGMENT_BONES[segId];
    const bone = boneMap.get(boneName);

    if (!bone) {
      console.warn(`[Explode] Bone "${boneName}" not found for segment "${segId}"`);
      continue;
    }

    const dir = SEGMENT_DIRECTIONS[segId];
    const direction = new THREE.Vector3(dir[0], dir[1], dir[2]).normalize();

    segments.set(segId, {
      bone,
      restPosition: bone.position.clone(),
      direction,
    });
  }

  console.log(`[Explode] Initialized ${segments.size}/${segmentIds.length} segments`);

  return { segments, platformMesh, platformRestY, ready: segments.size > 0 };
}

/**
 * Apply explode offsets to bones. Call in useFrame().
 * progress: 0 = assembled, 1 = fully exploded
 * weights: per-segment weight multiplier (0..1)
 * maxDist: maximum displacement in local bone units
 */
export function applyExplode(
  state: ExplodeState,
  progress: number,
  weights: Record<SegmentId, number>,
  maxDist: number = EXPLODE_MAX_DISTANCE,
): void {
  if (!state.ready || progress <= 0.001) {
    // At zero progress, ensure bones are at rest
    if (progress <= 0.001) {
      resetExplode(state);
    }
    return;
  }

  state.segments.forEach((seg, segId) => {
    const w = weights[segId] ?? 1;
    const dist = progress * w * maxDist;

    // Offset in the bone's local space: direction * distance
    // Since direction is in model space and bones are in parent-local space,
    // we compute the offset relative to rest position
    _offset.copy(seg.direction).multiplyScalar(dist);

    seg.bone.position.copy(seg.restPosition).add(_offset);
    seg.bone.matrixWorldNeedsUpdate = true;
  });

  // Platform mesh moves down
  if (state.platformMesh) {
    const pw = weights.platform ?? 1;
    state.platformMesh.position.y = state.platformRestY - progress * pw * maxDist * 0.3;
  }
}

/**
 * Reset all bones to their rest positions. Call when exiting tour.
 */
export function resetExplode(state: ExplodeState): void {
  state.segments.forEach((seg) => {
    seg.bone.position.copy(seg.restPosition);
    seg.bone.matrixWorldNeedsUpdate = true;
  });

  if (state.platformMesh) {
    state.platformMesh.position.y = state.platformRestY;
  }
}
