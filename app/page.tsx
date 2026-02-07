'use client';

import { Suspense } from 'react';
import { Scene } from './_components/Scene';
import { UIOverlay } from './_components/UIOverlay';
import { ErrorOverlay } from './_components/ErrorOverlay';
import { useSearchParams } from 'next/navigation';

function DevHarnessLoader() {
  const searchParams = useSearchParams();
  const isDev = searchParams.get('dev') === '1';

  if (!isDev) return null;

  // Lazy import to avoid bundling in production
  const { DevHarness } = require('./_components/DevHarness');
  return <DevHarness />;
}

export default function HomePage() {
  return (
    <ErrorOverlay>
      <Scene />
      <UIOverlay />
      <Suspense fallback={null}>
        <DevHarnessLoader />
      </Suspense>
    </ErrorOverlay>
  );
}
