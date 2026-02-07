import { create } from 'zustand';
import { DURATION_MS } from './motion';

type Mode = 'skeleton' | 'skin';
type TransitionPhase = 'idle' | 'toSkin' | 'toSkeleton';

interface AppState {
  mode: Mode;
  sceneReady: boolean;
  modeLockedUntil: number;
  transitionPhase: TransitionPhase;
  skinReady: boolean;
  hasRoarClip: boolean;
  roarRequested: boolean;

  setSceneReady: (ready: boolean) => void;
  requestMode: (mode: Mode) => void;
  lockModeSwitch: (ms: number) => void;
  setSkinReady: (ready: boolean) => void;
  setHasRoarClip: (has: boolean) => void;
  setTransitionPhase: (phase: TransitionPhase) => void;
  triggerRoar: () => void;
  clearRoarRequest: () => void;
}

export const useStore = create<AppState>((set, get) => ({
  mode: 'skeleton',
  sceneReady: false,
  modeLockedUntil: 0,
  transitionPhase: 'idle',
  skinReady: false,
  hasRoarClip: false,
  roarRequested: false,

  setSceneReady: (ready) => set({ sceneReady: ready }),

  requestMode: (mode) => {
    const now = Date.now();
    const { modeLockedUntil, mode: current } = get();

    if (now < modeLockedUntil || mode === current) {
      return;
    }

    const phase: TransitionPhase = mode === 'skin' ? 'toSkin' : 'toSkeleton';
    set({ mode, transitionPhase: phase });
    get().lockModeSwitch(DURATION_MS.transitionGuard);
  },

  lockModeSwitch: (ms) => {
    set({ modeLockedUntil: Date.now() + ms });
  },

  setSkinReady: (ready) => set({ skinReady: ready }),
  setHasRoarClip: (has) => set({ hasRoarClip: has }),
  setTransitionPhase: (phase) => set({ transitionPhase: phase }),
  triggerRoar: () => set({ roarRequested: true }),
  clearRoarRequest: () => set({ roarRequested: false }),
}));
