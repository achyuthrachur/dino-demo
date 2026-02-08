import * as THREE from 'three';
import { animate } from 'animejs';
import { DURATION_MS, EASING } from '../motion';

/**
 * Smoothly animate camera position and orbit target to a new pose.
 * Returns a Promise that resolves when the animation completes.
 *
 * @param camera - The Three.js camera
 * @param controls - OrbitControls instance (from drei makeDefault)
 * @param targetPos - Destination camera position [x, y, z]
 * @param targetLookAt - Destination orbit target [x, y, z]
 * @param duration - Animation duration in ms
 */
export function animateCameraToTarget(
  camera: THREE.Camera,
  controls: { target: THREE.Vector3; enabled: boolean; update: () => void },
  targetPos: [number, number, number],
  targetLookAt: [number, number, number],
  duration: number = DURATION_MS.chapterCamera,
): Promise<void> {
  return new Promise((resolve) => {
    // Proxy object for Anime.js to tween
    const proxy = {
      px: camera.position.x,
      py: camera.position.y,
      pz: camera.position.z,
      tx: controls.target.x,
      ty: controls.target.y,
      tz: controls.target.z,
    };

    // Disable user orbit during animation
    controls.enabled = false;

    animate(proxy, {
      px: targetPos[0],
      py: targetPos[1],
      pz: targetPos[2],
      tx: targetLookAt[0],
      ty: targetLookAt[1],
      tz: targetLookAt[2],
      duration,
      ease: EASING.animeChapter,
      onUpdate: () => {
        camera.position.set(proxy.px, proxy.py, proxy.pz);
        controls.target.set(proxy.tx, proxy.ty, proxy.tz);
        controls.update();
      },
      onComplete: () => {
        controls.enabled = true;
        resolve();
      },
    });
  });
}
