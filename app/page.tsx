'use client';

import { Suspense } from 'react';
import { Scene } from './_components/Scene';
import { UIOverlay } from './_components/UIOverlay';
import { ExhibitHUD } from './_components/ExhibitHUD';
import { FactsPanel } from './_components/FactsPanel';
import { AnnotationLines } from './_components/AnnotationLines';
import { ErrorOverlay } from './_components/ErrorOverlay';
import { InputPanel } from './_components/InputPanel';
import { VoicePTTButton } from './_components/VoicePTTButton';
import { GestureStatusPill } from './_components/GestureStatusPill';
import { ToastOverlay } from './_components/ToastOverlay';
import { CameraPreview } from './_components/CameraPreview';
import { useSearchParams } from 'next/navigation';

function DevToolsLoader() {
  const searchParams = useSearchParams();
  const isDev = searchParams.get('dev') === '1';

  if (!isDev) return null;

  // Lazy import to avoid bundling in production
  const { DevHarness } = require('./_components/DevHarness');
  const { DevPanel } = require('./_components/DevPanel');
  const { DevInputPanel } = require('./_components/DevInputPanel');
  return (
    <>
      <DevHarness />
      <DevPanel />
      <DevInputPanel />
    </>
  );
}

export default function HomePage() {
  return (
    <ErrorOverlay>
      <Scene />
      <UIOverlay />
      <ExhibitHUD />
      <FactsPanel />
      <AnnotationLines />
      <InputPanel />
      <VoicePTTButton />
      <GestureStatusPill />
      <ToastOverlay />
      <CameraPreview />
      <Suspense fallback={null}>
        <DevToolsLoader />
      </Suspense>
    </ErrorOverlay>
  );
}
