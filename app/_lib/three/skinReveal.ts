import * as THREE from 'three';

/**
 * Clipping-plane based skin reveal transition.
 * A horizontal plane sweeps vertically to reveal/hide the skin model.
 */

const clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);

export interface SkinBounds {
  minY: number;
  maxY: number;
}

/**
 * Compute the Y-axis bounding box of a scene for reveal mapping.
 */
export function computeSkinBounds(scene: THREE.Object3D): SkinBounds {
  const box = new THREE.Box3().setFromObject(scene);
  return { minY: box.min.y, maxY: box.max.y };
}

/**
 * Enable clipping on all mesh materials in the skin scene.
 * Call before starting the reveal animation.
 */
export function setupSkinClipping(skinScene: THREE.Object3D): void {
  skinScene.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const mat of materials) {
        mat.clippingPlanes = [clipPlane];
        mat.clipShadows = true;
        mat.needsUpdate = true;
      }
    }
  });
}

/**
 * Set the reveal progress.
 * progress: 0 = fully hidden (clipped), 1 = fully visible
 */
export function setSkinRevealProgress(progress: number, bounds: SkinBounds): void {
  // Map progress 0→1 to Y position minY → maxY + margin
  const margin = (bounds.maxY - bounds.minY) * 0.1;
  const y = bounds.minY + progress * (bounds.maxY - bounds.minY + margin);
  clipPlane.constant = y;
}

/**
 * Remove clipping from all mesh materials. Call after reveal completes.
 */
export function removeSkinClipping(skinScene: THREE.Object3D): void {
  skinScene.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const mat of materials) {
        mat.clippingPlanes = [];
        mat.clipShadows = false;
        mat.needsUpdate = true;
      }
    }
  });
}

/**
 * Set clipPlane to hide everything (progress = 0).
 * Call before reveal starts to ensure skin is invisible.
 */
export function hideSkinClipping(bounds: SkinBounds): void {
  clipPlane.constant = bounds.minY - 1;
}
