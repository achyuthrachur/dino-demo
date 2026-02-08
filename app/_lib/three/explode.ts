import * as THREE from 'three';
import { SEGMENT_BONES, EXPLODE_MAX_DISTANCE } from '../explodePresets';
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
    // Strategy 2: Direct type check + isBone flag
    if ((child.type === 'Bone' || (child as THREE.Bone).isBone) && child.name && !boneMap.has(child.name)) {
      boneMap.set(child.name, child as THREE.Bone);
    }
    if (child.name === 'platform_0' && child instanceof THREE.Mesh) {
      platformMesh = child;
      platformRestY = child.position.y;
    }
  });

  // Strategy 3: Name-based fallback — match nodes by name against SEGMENT_BONES values
  if (boneMap.size === 0) {
    const targetNames = new Set(Object.values(SEGMENT_BONES));
    scene.traverse((child) => {
      if (child.name && targetNames.has(child.name) && !boneMap.has(child.name)) {
        boneMap.set(child.name, child as THREE.Bone);
      }
    });
    if (boneMap.size > 0) {
      console.log(`[Explode] Found ${boneMap.size} bones via name-based fallback`);
    }
  }

  // Log bone detection summary (kept for debugging explode issues)
  if (typeof window !== 'undefined' && boneMap.size === 0) {
    console.warn('[Explode] No bones found in skeleton scene');
  }

  const segmentIds = Object.keys(SEGMENT_BONES) as Exclude<SegmentId, 'platform'>[];

  // Ensure world matrices are current for parent-local transform
  scene.updateWorldMatrix(true, true);

  // Multi-axis world-space explode directions (artistic, not purely radial)
  // Each bone moves outward along 2-3 axes for a dramatic spread
  const WORLD_DIRS: Record<string, [number, number, number]> = {
    skull:  [0,    0.5,  1   ],  // forward + up
    neck:   [0,    0.9,  0.4 ],  // mostly up + slight forward
    chest:  [0,    0.6, -0.2 ],  // up + slight back
    arm_l:  [-1,   0.4,  0.2 ],  // left + up + slight forward
    arm_r:  [1,    0.4,  0.2 ],  // right + up + slight forward
    pelvis: [0,   -0.6, -0.3 ],  // down + back
    tail:   [0,   -0.3, -1   ],  // back + slight down
    leg_l:  [-0.7, -0.8, -0.3],  // left + down + slight back
    leg_r:  [0.7, -0.8, -0.3],   // right + down + slight back
  };

  for (const segId of segmentIds) {
    const boneName = SEGMENT_BONES[segId];
    const bone = boneMap.get(boneName);

    if (!bone) {
      console.warn(`[Explode] Bone "${boneName}" not found for segment "${segId}"`);
      continue;
    }

    // Start with the designed world-space direction
    const wd = WORLD_DIRS[segId] ?? [0, 1, 0];
    const direction = new THREE.Vector3(wd[0], wd[1], wd[2]).normalize();

    // Transform from world space to bone's parent-local space
    if (bone.parent) {
      _parentWorld.copy(bone.parent.matrixWorld).invert();
      direction.transformDirection(_parentWorld);
    }
    direction.normalize();

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
