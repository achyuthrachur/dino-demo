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
        intensity={0.3}
        luminanceThreshold={0.6}
        luminanceSmoothing={0.9}
        kernelSize={KernelSize.MEDIUM}
        blendFunction={BlendFunction.ADD}
      />
      <Vignette
        offset={0.4}
        darkness={0.4}
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
        intensity={0.8}
        luminanceThreshold={0.2}
        luminanceSmoothing={0.9}
        kernelSize={KernelSize.LARGE}
        blendFunction={BlendFunction.ADD}
      />
      <Vignette
        offset={0.3}
        darkness={0.7}
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
