import { create } from 'zustand';
import { animate } from 'animejs';
import { CHAPTERS, HOME_CAMERA } from './tour';
import { DURATION_MS, EASING } from './motion';

export type SegmentId =
  | 'skull'
  | 'neck'
  | 'chest'
  | 'arm_l'
  | 'arm_r'
  | 'pelvis'
  | 'tail'
  | 'leg_l'
  | 'leg_r'
  | 'platform';

export type DirectorPhase = 'home' | 'busy' | 'touring';

interface DirectorState {
  phase: DirectorPhase;
  activeChapter: number; // -1 = home, 0..N = chapter index
  explodeProgress: number; // 0..1
  segmentWeights: Record<SegmentId, number>;

  // Called by UI — kicks off orchestrated animation
  goToChapter: (i: number) => void;
  goHome: () => void;
  toggleExplode: () => void;

  // Called by animation internals
  setExplodeProgress: (p: number) => void;
  setPhase: (phase: DirectorPhase) => void;
  setSegmentWeights: (weights: Record<SegmentId, number>) => void;

  // Camera/controls refs — set by CameraRig
  _cameraRef: THREE.Camera | null;
  _controlsRef: { target: THREE.Vector3; enabled: boolean; update: () => void } | null;
  setCameraRefs: (
    camera: THREE.Camera,
    controls: { target: THREE.Vector3; enabled: boolean; update: () => void },
  ) => void;
}

import * as THREE from 'three';

const DEFAULT_WEIGHTS: Record<SegmentId, number> = {
  skull: 1,
  neck: 1,
  chest: 1,
  arm_l: 1,
  arm_r: 1,
  pelvis: 1,
  tail: 1,
  leg_l: 1,
  leg_r: 1,
  platform: 1,
};

export const useDirector = create<DirectorState>((set, get) => ({
  phase: 'home',
  activeChapter: -1,
  explodeProgress: 0,
  segmentWeights: { ...DEFAULT_WEIGHTS },
  _cameraRef: null,
  _controlsRef: null,

  setCameraRefs: (camera, controls) => {
    set({ _cameraRef: camera, _controlsRef: controls });
  },

  goToChapter: (i: number) => {
    const { phase, activeChapter, _cameraRef, _controlsRef } = get();
    if (phase === 'busy') return;
    if (i === activeChapter) return;

    const chapter = CHAPTERS[i];
    if (!chapter) return;

    set({
      phase: 'busy',
      activeChapter: i,
      segmentWeights: chapter.weights,
    });

    // Animate explode progress to chapter's target
    const proxy = { progress: get().explodeProgress };
    const explodeAnim = new Promise<void>((resolve) => {
      animate(proxy, {
        progress: chapter.explodeAmount,
        duration: DURATION_MS.explodeTransition,
        ease: EASING.animeChapter,
        onUpdate: () => {
          set({ explodeProgress: proxy.progress });
        },
        onComplete: () => resolve(),
      });
    });

    // Animate camera if refs are available
    const cameraAnim =
      _cameraRef && _controlsRef
        ? new Promise<void>((resolve) => {
            const camProxy = {
              px: _cameraRef.position.x,
              py: _cameraRef.position.y,
              pz: _cameraRef.position.z,
              tx: _controlsRef.target.x,
              ty: _controlsRef.target.y,
              tz: _controlsRef.target.z,
            };

            _controlsRef.enabled = false;

            animate(camProxy, {
              px: chapter.cameraPos[0],
              py: chapter.cameraPos[1],
              pz: chapter.cameraPos[2],
              tx: chapter.cameraTarget[0],
              ty: chapter.cameraTarget[1],
              tz: chapter.cameraTarget[2],
              duration: DURATION_MS.chapterCamera,
              ease: EASING.animeChapter,
              onUpdate: () => {
                _cameraRef.position.set(camProxy.px, camProxy.py, camProxy.pz);
                _controlsRef.target.set(camProxy.tx, camProxy.ty, camProxy.tz);
                _controlsRef.update();
              },
              onComplete: () => {
                _controlsRef.enabled = true;
                resolve();
              },
            });
          })
        : Promise.resolve();

    Promise.all([explodeAnim, cameraAnim]).then(() => {
      set({ phase: 'touring' });
    });
  },

  goHome: () => {
    const { phase, _cameraRef, _controlsRef } = get();
    if (phase === 'busy') return;

    set({ phase: 'busy' });

    // Animate explode back to 0
    const proxy = { progress: get().explodeProgress };
    const explodeAnim = new Promise<void>((resolve) => {
      animate(proxy, {
        progress: 0,
        duration: DURATION_MS.explodeTransition,
        ease: EASING.animeChapter,
        onUpdate: () => {
          set({ explodeProgress: proxy.progress });
        },
        onComplete: () => resolve(),
      });
    });

    // Animate camera home
    const cameraAnim =
      _cameraRef && _controlsRef
        ? new Promise<void>((resolve) => {
            const camProxy = {
              px: _cameraRef.position.x,
              py: _cameraRef.position.y,
              pz: _cameraRef.position.z,
              tx: _controlsRef.target.x,
              ty: _controlsRef.target.y,
              tz: _controlsRef.target.z,
            };

            _controlsRef.enabled = false;

            animate(camProxy, {
              px: HOME_CAMERA.position[0],
              py: HOME_CAMERA.position[1],
              pz: HOME_CAMERA.position[2],
              tx: HOME_CAMERA.target[0],
              ty: HOME_CAMERA.target[1],
              tz: HOME_CAMERA.target[2],
              duration: DURATION_MS.chapterCamera,
              ease: EASING.animeChapter,
              onUpdate: () => {
                _cameraRef.position.set(camProxy.px, camProxy.py, camProxy.pz);
                _controlsRef.target.set(camProxy.tx, camProxy.ty, camProxy.tz);
                _controlsRef.update();
              },
              onComplete: () => {
                _controlsRef.enabled = true;
                resolve();
              },
            });
          })
        : Promise.resolve();

    Promise.all([explodeAnim, cameraAnim]).then(() => {
      set({ phase: 'home', activeChapter: -1, explodeProgress: 0 });
    });
  },

  toggleExplode: () => {
    const { phase, activeChapter, explodeProgress } = get();
    if (phase === 'busy') return;
    if (activeChapter < 0) return;

    const chapter = CHAPTERS[activeChapter];
    if (!chapter) return;

    // Toggle between 0 and chapter's explode amount
    const target = explodeProgress > 0.01 ? 0 : chapter.explodeAmount;

    set({ phase: 'busy' });

    const proxy = { progress: explodeProgress };
    animate(proxy, {
      progress: target,
      duration: DURATION_MS.explodeTransition,
      ease: EASING.animeChapter,
      onUpdate: () => {
        set({ explodeProgress: proxy.progress });
      },
      onComplete: () => {
        set({ phase: 'touring' });
      },
    });
  },

  setExplodeProgress: (p: number) => {
    set({ explodeProgress: Math.max(0, Math.min(1, p)) });
  },

  setPhase: (phase: DirectorPhase) => {
    if (phase === 'home') {
      set({ phase: 'home', activeChapter: -1, explodeProgress: 0 });
    } else {
      set({ phase });
    }
  },

  setSegmentWeights: (weights: Record<SegmentId, number>) => {
    set({ segmentWeights: weights });
  },
}));
