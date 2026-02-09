import * as THREE from 'three';
import type { GestureState } from './config';
import { INPUT } from '../motion';

const _spherical = new THREE.Spherical();
const _offset = new THREE.Vector3();
const _right = new THREE.Vector3();
const _up = new THREE.Vector3();
const _dir = new THREE.Vector3();

interface CameraControls {
  target: THREE.Vector3;
  enabled: boolean;
  update: () => void;
}

export function applyGestureToCamera(
  gesture: GestureState,
  camera: THREE.Camera,
  controls: CameraControls,
): void {
  if (gesture.kind === 'none') return;

  switch (gesture.kind) {
    case 'rotate': {
      // Decompose camera→target offset to spherical, apply azimuth/elevation
      _offset.copy(camera.position).sub(controls.target);
      _spherical.setFromVector3(_offset);

      // Moving hand right orbits camera left (natural drag direction)
      _spherical.theta += gesture.dx * INPUT.rotateYawScale;
      _spherical.phi -= gesture.dy * INPUT.rotatePitchScale;

      // Clamp phi to avoid gimbal lock
      _spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, _spherical.phi));

      _offset.setFromSpherical(_spherical);
      camera.position.copy(controls.target).add(_offset);
      camera.lookAt(controls.target);
      controls.update();
      break;
    }

    case 'pan': {
      // Camera-local right/up vectors
      camera.getWorldDirection(_dir);
      _right.crossVectors(_dir, camera.up).normalize();
      _up.crossVectors(_right, _dir).normalize();

      const panX = -gesture.dx * INPUT.panXScale;
      const panY = gesture.dy * INPUT.panYScale;

      const panOffset = _right.multiplyScalar(panX).add(_up.multiplyScalar(panY));

      camera.position.add(panOffset);
      controls.target.add(panOffset);
      controls.update();
      break;
    }

    case 'zoom': {
      // Move camera along view direction
      _dir.copy(camera.position).sub(controls.target);
      const currentDist = _dir.length();

      // Positive dz (hands spreading) = zoom in, negative = zoom out
      const zoomDelta = -gesture.dz * INPUT.zoomScale;
      const newDist = Math.max(
        INPUT.minDistance,
        Math.min(INPUT.maxDistance, currentDist + zoomDelta),
      );

      _dir.normalize().multiplyScalar(newDist);
      camera.position.copy(controls.target).add(_dir);
      controls.update();
      break;
    }
  }
}
