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
import { HeroTitle } from './_components/HeroTitle';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

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
      <HeroTitle />
      <UIOverlay />
      <ExhibitHUD />
      <FactsPanel />
      <AnnotationLines />
      <InputPanel />
      <VoicePTTButton />
      <GestureStatusPill />
      <ToastOverlay />
      <CameraPreview />
      <Link
        href="/arcade"
        style={{
          position: 'fixed',
          top: '1rem',
          right: '1rem',
          zIndex: 20,
          border: '1px solid rgba(124,247,198,0.4)',
          background: 'rgba(124,247,198,0.12)',
          color: 'var(--accent)',
          textDecoration: 'none',
          borderRadius: 8,
          fontWeight: 700,
          fontSize: '0.8rem',
          letterSpacing: '0.04em',
          padding: '0.45rem 0.75rem',
        }}
      >
        ARCADE MODE
      </Link>
      <Suspense fallback={null}>
        <DevToolsLoader />
      </Suspense>
    </ErrorOverlay>
  );
}
