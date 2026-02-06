// =============================================================================
// Dino Demo - Zustand State Store
// =============================================================================

import { create } from 'zustand';
import { ScanMode, DataMode } from './types';

// -----------------------------------------------------------------------------
// State Interface
// -----------------------------------------------------------------------------

interface ExhibitState {
  // Active specimen (T-Rex only)
  selectedSpecimenId: string | null;

  // 3D View State
  explodeFactor: number; // 0-1 range
  scanMode: ScanMode;
  showCallouts: boolean;

  // Bone Focus (Claw Mechanics)
  focusedBoneName: string | null;
  isBoneFocusActive: boolean;
  boneFocusExplodeFactor: number; // Separate explode for focused bone group

  // Data Display
  dataMode: DataMode;

  // Presenter Mode
  presenterActive: boolean;
  presenterConfidence: number;

  // UI State
  isCompareDrawerOpen: boolean;
  compareTargetId: string | null;

  // Animation
  animationAction: 'Idle' | 'Roar' | 'Walk';

  // Camera
  cameraTarget: 'idle' | 'head' | 'claw';

  // Actions
  setSelectedSpecimen: (id: string | null) => void;
  setExplodeFactor: (factor: number) => void;
  setScanMode: (mode: ScanMode) => void;
  cycleScanMode: () => void;
  toggleCallouts: () => void;
  setDataMode: (mode: DataMode) => void;
  toggleDataMode: () => void;
  setPresenterActive: (active: boolean) => void;
  setPresenterConfidence: (confidence: number) => void;
  openCompareDrawer: (targetId: string) => void;
  closeCompareDrawer: () => void;
  setAnimationAction: (action: 'Idle' | 'Roar' | 'Walk') => void;
  setCameraTarget: (target: 'idle' | 'head' | 'claw') => void;
  focusBone: (boneName: string) => void;
  clearBoneFocus: () => void;
  setBoneFocusExplode: (factor: number) => void;
  reset: () => void;
}

// -----------------------------------------------------------------------------
// Initial State
// -----------------------------------------------------------------------------

const initialState = {
  selectedSpecimenId: 'tyrannosaurus-rex',
  explodeFactor: 0,
  scanMode: 'skeleton' as ScanMode,
  showCallouts: true,
  focusedBoneName: null as string | null,
  isBoneFocusActive: false,
  boneFocusExplodeFactor: 0,
  dataMode: 'museum' as DataMode,
  animationAction: 'Idle' as const,
  presenterActive: false,
  presenterConfidence: 0,
  isCompareDrawerOpen: false,
  compareTargetId: null as string | null,
  cameraTarget: 'idle' as const,
};

// -----------------------------------------------------------------------------
// Scan Mode Cycle Order
// -----------------------------------------------------------------------------

const scanModeOrder: ScanMode[] = ['skeleton', 'skin', 'xray'];

// -----------------------------------------------------------------------------
// Store Creation
// -----------------------------------------------------------------------------

export const useExhibitStore = create<ExhibitState>((set, get) => ({
  // Initial state values
  ...initialState,

  // ---------------------------------------------------------------------------
  // Specimen Actions
  // ---------------------------------------------------------------------------

  setSelectedSpecimen: (id) =>
    set({
      selectedSpecimenId: id,
      // Reset view state when changing specimen
      explodeFactor: 0,
      cameraTarget: 'idle',
    }),

  // ---------------------------------------------------------------------------
  // 3D View Actions
  // ---------------------------------------------------------------------------

  setExplodeFactor: (factor) =>
    set({
      // Clamp factor to 0-1 range
      explodeFactor: Math.max(0, Math.min(1, factor)),
    }),

  setScanMode: (mode) =>
    set({
      scanMode: mode,
    }),

  cycleScanMode: () => {
    const currentMode = get().scanMode;
    const currentIndex = scanModeOrder.indexOf(currentMode);
    const nextIndex = (currentIndex + 1) % scanModeOrder.length;
    set({
      scanMode: scanModeOrder[nextIndex],
    });
  },

  toggleCallouts: () =>
    set((state) => ({
      showCallouts: !state.showCallouts,
    })),

  // ---------------------------------------------------------------------------
  // Data Display Actions
  // ---------------------------------------------------------------------------

  setDataMode: (mode) =>
    set({
      dataMode: mode,
    }),

  toggleDataMode: () =>
    set((state) => ({
      dataMode: state.dataMode === 'museum' ? 'scientific' : 'museum',
    })),

  // ---------------------------------------------------------------------------
  // Presenter Mode Actions
  // ---------------------------------------------------------------------------

  setPresenterActive: (active) =>
    set({
      presenterActive: active,
      // Reset confidence when deactivating
      presenterConfidence: active ? get().presenterConfidence : 0,
    }),

  setPresenterConfidence: (confidence) =>
    set({
      // Clamp confidence to 0-1 range
      presenterConfidence: Math.max(0, Math.min(1, confidence)),
    }),

  // ---------------------------------------------------------------------------
  // Compare Drawer Actions
  // ---------------------------------------------------------------------------

  openCompareDrawer: (targetId) =>
    set({
      isCompareDrawerOpen: true,
      compareTargetId: targetId,
    }),

  closeCompareDrawer: () =>
    set({
      isCompareDrawerOpen: false,
      compareTargetId: null,
    }),

  // ---------------------------------------------------------------------------
  // Animation Actions
  // ---------------------------------------------------------------------------

  setAnimationAction: (action) =>
    set({
      animationAction: action,
    }),

  // ---------------------------------------------------------------------------
  // Camera Actions
  // ---------------------------------------------------------------------------

  setCameraTarget: (target) =>
    set({
      cameraTarget: target,
    }),

  // ---------------------------------------------------------------------------
  // Bone Focus Actions (Claw Mechanics)
  // ---------------------------------------------------------------------------

  focusBone: (boneName) =>
    set({
      focusedBoneName: boneName,
      isBoneFocusActive: true,
      boneFocusExplodeFactor: 0.7, // Auto-explode when focusing
      // Determine camera target based on bone
      cameraTarget: boneName.includes('claw') || boneName.includes('foot')
        ? 'claw'
        : boneName.includes('skull') || boneName.includes('head') || boneName.includes('jaw')
          ? 'head'
          : 'idle',
    }),

  clearBoneFocus: () =>
    set({
      focusedBoneName: null,
      isBoneFocusActive: false,
      boneFocusExplodeFactor: 0,
      cameraTarget: 'idle',
    }),

  setBoneFocusExplode: (factor) =>
    set({
      boneFocusExplodeFactor: Math.max(0, Math.min(1, factor)),
    }),

  // ---------------------------------------------------------------------------
  // Reset Action
  // ---------------------------------------------------------------------------

  reset: () => set(initialState),
}));

// -----------------------------------------------------------------------------
// Selector Hooks (for optimized re-renders)
// -----------------------------------------------------------------------------

/** Select only the specimen-related state */
export const useSpecimenState = () =>
  useExhibitStore((state) => ({
    selectedSpecimenId: state.selectedSpecimenId,
  }));

/** Select only the 3D view state */
export const useViewState = () =>
  useExhibitStore((state) => ({
    explodeFactor: state.explodeFactor,
    scanMode: state.scanMode,
    showCallouts: state.showCallouts,
    cameraTarget: state.cameraTarget,
  }));

/** Select only the data display state */
export const useDataDisplayState = () =>
  useExhibitStore((state) => ({
    dataMode: state.dataMode,
  }));

/** Select only the presenter state */
export const usePresenterState = () =>
  useExhibitStore((state) => ({
    presenterActive: state.presenterActive,
    presenterConfidence: state.presenterConfidence,
  }));

/** Select only the compare drawer state */
export const useCompareDrawerState = () =>
  useExhibitStore((state) => ({
    isCompareDrawerOpen: state.isCompareDrawerOpen,
    compareTargetId: state.compareTargetId,
  }));

/** Select only the bone focus state */
export const useBoneFocusState = () =>
  useExhibitStore((state) => ({
    focusedBoneName: state.focusedBoneName,
    isBoneFocusActive: state.isBoneFocusActive,
    boneFocusExplodeFactor: state.boneFocusExplodeFactor,
  }));
