'use client';

import { Suspense } from 'react';
import { Scene } from './_components/Scene';
import { UIOverlay } from './_components/UIOverlay';
import { ExhibitHUD } from './_components/ExhibitHUD';
import { FactsPanel } from './_components/FactsPanel';
import { ErrorOverlay } from './_components/ErrorOverlay';
import { useSearchParams } from 'next/navigation';

function DevToolsLoader() {
  const searchParams = useSearchParams();
  const isDev = searchParams.get('dev') === '1';

  if (!isDev) return null;

  // Lazy import to avoid bundling in production
  const { DevHarness } = require('./_components/DevHarness');
  const { DevPanel } = require('./_components/DevPanel');
  return (
    <>
      <DevHarness />
      <DevPanel />
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
      <Suspense fallback={null}>
        <DevToolsLoader />
      </Suspense>
    </ErrorOverlay>
  );
}
