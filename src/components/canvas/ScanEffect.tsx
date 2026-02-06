'use client';

// =============================================================================
// ScanEffect.tsx - Post-Processing Effects for Scan Modes
// =============================================================================

import { useMemo } from 'react';
import {
  EffectComposer,
  Bloom,
  Vignette,
} from '@react-three/postprocessing';
import { BlendFunction, KernelSize } from 'postprocessing';
import { useExhibitStore } from '@/lib/store';

// -----------------------------------------------------------------------------
// Skeleton Mode Effects
// -----------------------------------------------------------------------------

function SkeletonEffects() {
  return (
    <EffectComposer>
      <Bloom
        intensity={0.2}
        luminanceThreshold={0.8}
        luminanceSmoothing={0.9}
        kernelSize={KernelSize.MEDIUM}
        blendFunction={BlendFunction.ADD}
      />
      <Vignette
        offset={0.5}
        darkness={0.3}
        blendFunction={BlendFunction.NORMAL}
      />
    </EffectComposer>
  );
}

// -----------------------------------------------------------------------------
// Skin Mode Effects
// -----------------------------------------------------------------------------

function SkinEffects() {
  return (
    <EffectComposer>
      <Bloom
        intensity={0.5}
        luminanceThreshold={0.4}
        luminanceSmoothing={0.85}
        kernelSize={KernelSize.LARGE}
        blendFunction={BlendFunction.ADD}
      />
      <Vignette
        offset={0.35}
        darkness={0.5}
        blendFunction={BlendFunction.NORMAL}
      />
    </EffectComposer>
  );
}

// -----------------------------------------------------------------------------
// X-Ray Mode Effects
// -----------------------------------------------------------------------------

function XRayEffects() {
  return (
    <EffectComposer>
      <Bloom
        intensity={1.2}
        luminanceThreshold={0.15}
        luminanceSmoothing={0.8}
        kernelSize={KernelSize.HUGE}
        blendFunction={BlendFunction.ADD}
      />
      <Vignette
        offset={0.25}
        darkness={0.8}
        blendFunction={BlendFunction.NORMAL}
      />
    </EffectComposer>
  );
}

// -----------------------------------------------------------------------------
// Main Scan Effect Export
// -----------------------------------------------------------------------------

export function ScanEffect() {
  const scanMode = useExhibitStore((state) => state.scanMode);

  // Render the appropriate effect composer based on scan mode
  const effects = useMemo(() => {
    switch (scanMode) {
      case 'xray':
        return <XRayEffects />;
      case 'skin':
        return <SkinEffects />;
      case 'skeleton':
      default:
        return <SkeletonEffects />;
    }
  }, [scanMode]);

  return effects;
}
