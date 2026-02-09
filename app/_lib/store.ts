import { create } from 'zustand';
import { DURATION_MS } from './motion';

type Mode = 'skeleton' | 'skin';
type TransitionPhase = 'idle' | 'toSkin' | 'toSkeleton';
type GestureKind = 'none' | 'rotate' | 'pan' | 'zoom';

interface AppState {
  mode: Mode;
  sceneReady: boolean;
  modeLockedUntil: number;
  transitionPhase: TransitionPhase;
  skinReady: boolean;
  hasRoarClip: boolean;
  roarRequested: boolean;
  hasWalkClip: boolean;
  walkRequested: boolean;

  // Stage 3: Gesture input
  gestureEnabled: boolean;
  gestureKind: GestureKind;
  gestureConfidence: number;

  // Stage 3: Voice input
  voiceEnabled: boolean;
  voiceListening: boolean;
  voiceTranscript: string;

  // Stage 3: Toast
  toastMessage: string;
  toastTimestamp: number;

  setSceneReady: (ready: boolean) => void;
  requestMode: (mode: Mode) => void;
  lockModeSwitch: (ms: number) => void;
  setSkinReady: (ready: boolean) => void;
  setHasRoarClip: (has: boolean) => void;
  setHasWalkClip: (has: boolean) => void;
  setTransitionPhase: (phase: TransitionPhase) => void;
  triggerRoar: () => void;
  clearRoarRequest: () => void;
  triggerWalk: () => void;
  clearWalkRequest: () => void;

  // Stage 3 actions
  setGestureEnabled: (enabled: boolean) => void;
  setGestureKind: (kind: GestureKind) => void;
  setGestureConfidence: (confidence: number) => void;
  setVoiceEnabled: (enabled: boolean) => void;
  setVoiceListening: (listening: boolean) => void;
  setVoiceTranscript: (transcript: string) => void;
  showToast: (msg: string) => void;
  clearToast: () => void;
}

export const useStore = create<AppState>((set, get) => ({
  mode: 'skeleton',
  sceneReady: false,
  modeLockedUntil: 0,
  transitionPhase: 'idle',
  skinReady: false,
  hasRoarClip: false,
  roarRequested: false,
  hasWalkClip: false,
  walkRequested: false,

  // Stage 3: Gesture
  gestureEnabled: false,
  gestureKind: 'none',
  gestureConfidence: 0,

  // Stage 3: Voice
  voiceEnabled: false,
  voiceListening: false,
  voiceTranscript: '',

  // Stage 3: Toast
  toastMessage: '',
  toastTimestamp: 0,

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
  setHasWalkClip: (has) => set({ hasWalkClip: has }),
  setTransitionPhase: (phase) => set({ transitionPhase: phase }),
  triggerRoar: () => set({ roarRequested: true }),
  clearRoarRequest: () => set({ roarRequested: false }),
  triggerWalk: () => set({ walkRequested: true }),
  clearWalkRequest: () => set({ walkRequested: false }),

  // Stage 3 actions
  setGestureEnabled: (enabled) => set({ gestureEnabled: enabled }),
  setGestureKind: (kind) => set({ gestureKind: kind }),
  setGestureConfidence: (confidence) => set({ gestureConfidence: confidence }),
  setVoiceEnabled: (enabled) => set({ voiceEnabled: enabled }),
  setVoiceListening: (listening) => set({ voiceListening: listening }),
  setVoiceTranscript: (transcript) => set({ voiceTranscript: transcript }),
  showToast: (msg) => set({ toastMessage: msg, toastTimestamp: Date.now() }),
  clearToast: () => set({ toastMessage: '', toastTimestamp: 0 }),
}));
