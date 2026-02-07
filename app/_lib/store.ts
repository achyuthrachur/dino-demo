import { create } from 'zustand';
import { STAGE_LOCKS } from './motion';

type Mode = 'skeleton' | 'skin';

interface AppState {
  mode: Mode;
  sceneReady: boolean;
  modeLockedUntil: number;

  setSceneReady: (ready: boolean) => void;
  requestMode: (mode: Mode) => void;
  lockModeSwitch: (ms: number) => void;
}

export const useStore = create<AppState>((set, get) => ({
  mode: 'skeleton',
  sceneReady: false,
  modeLockedUntil: 0,

  setSceneReady: (ready) => set({ sceneReady: ready }),

  requestMode: (mode) => {
    const now = Date.now();
    const { modeLockedUntil } = get();

    if (now < modeLockedUntil) {
      return;
    }

    set({ mode });
    get().lockModeSwitch(STAGE_LOCKS.modeSwitchLockMs);
  },

  lockModeSwitch: (ms) => {
    set({ modeLockedUntil: Date.now() + ms });
  },
}));
