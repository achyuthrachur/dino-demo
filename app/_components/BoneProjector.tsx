'use client';

import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useDirector } from '../_lib/director';
import { CHAPTERS } from '../_lib/tour';
import { projectedAnchor } from '../_lib/boneProjection';

interface Props {
  skeletonScene: THREE.Object3D | null;
}

/**
 * R3F component that projects a skeleton bone's world position to screen pixels.
 * Writes to the shared mutable `projectedAnchor` ref every frame — zero GC.
 */
export function BoneProjector({ skeletonScene }: Props) {
  const { gl } = useThree();
  const boneMapRef = useRef<Map<string, THREE.Bone>>(new Map());
  const worldPos = useRef(new THREE.Vector3());
  const projected = useRef(new THREE.Vector3());

  // Build bone lookup map when skeleton scene changes
  useEffect(() => {
    const map = new Map<string, THREE.Bone>();
    if (skeletonScene) {
      // Strategy 1: SkinnedMesh skeleton bones (most reliable)
      skeletonScene.traverse((obj) => {
        if ((obj as THREE.SkinnedMesh).isSkinnedMesh) {
          const skinned = obj as THREE.SkinnedMesh;
          if (skinned.skeleton?.bones) {
            for (const bone of skinned.skeleton.bones) {
              if (bone.name && !map.has(bone.name)) {
                map.set(bone.name, bone);
              }
            }
          }
        }
      });
      // Strategy 2: Direct isBone traverse
      if (map.size === 0) {
        skeletonScene.traverse((obj) => {
          if ((obj as THREE.Bone).isBone && obj.name && !map.has(obj.name)) {
            map.set(obj.name, obj as THREE.Bone);
          }
        });
      }
    }
    boneMapRef.current = map;

    // Hide anchor when skeleton changes
    projectedAnchor.visible = false;

    return () => {
      projectedAnchor.visible = false;
    };
  }, [skeletonScene]);

  useFrame(({ camera }) => {
    const { activeChapter, phase } = useDirector.getState();

    // Only project when touring with a valid chapter that has an anchor bone
    if (phase === 'home' || activeChapter < 0) {
      projectedAnchor.visible = false;
      return;
    }

    const chapter = CHAPTERS[activeChapter];
    if (!chapter?.anchorBone) {
      projectedAnchor.visible = false;
      return;
    }

    const bone = boneMapRef.current.get(chapter.anchorBone);
    if (!bone) {
      projectedAnchor.visible = false;
      return;
    }

    // Get world position of the bone
    bone.getWorldPosition(worldPos.current);

    // Project to NDC
    projected.current.copy(worldPos.current).project(camera);

    // Check if behind camera
    if (projected.current.z > 1) {
      projectedAnchor.visible = false;
      return;
    }

    // Convert NDC → screen pixels
    const canvas = gl.domElement;
    const rect = canvas.getBoundingClientRect();
    const sx = ((projected.current.x + 1) / 2) * rect.width + rect.left;
    const sy = ((-projected.current.y + 1) / 2) * rect.height + rect.top;

    // 1px jitter threshold to avoid unnecessary repaints
    if (
      Math.abs(sx - projectedAnchor.x) > 1 ||
      Math.abs(sy - projectedAnchor.y) > 1 ||
      !projectedAnchor.visible
    ) {
      projectedAnchor.x = sx;
      projectedAnchor.y = sy;
    }
    projectedAnchor.visible = true;
  });

  return null;
}
