import * as THREE from 'three';

const originalOpacity = new WeakMap<THREE.Material, number>();

export function ensureTransparent(root: THREE.Object3D): void {
  root.traverse((child) => {
    if (child instanceof THREE.Mesh && child.material) {
      const mat = child.material as THREE.MeshStandardMaterial;
      if (!originalOpacity.has(mat)) {
        originalOpacity.set(mat, mat.opacity);
      }
      mat.transparent = true;
    }
  });
}

export function setSceneOpacity(root: THREE.Object3D, opacity: number): void {
  root.traverse((child) => {
    if (child instanceof THREE.Mesh && child.material) {
      const mat = child.material as THREE.MeshStandardMaterial;
      mat.opacity = opacity;
      mat.visible = opacity > 0.005;
    }
  });
}
