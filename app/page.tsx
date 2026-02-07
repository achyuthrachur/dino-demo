'use client';

import { Scene } from './_components/Scene';
import { UIOverlay } from './_components/UIOverlay';
import { ErrorOverlay } from './_components/ErrorOverlay';

export default function HomePage() {
  return (
    <ErrorOverlay>
      <Scene />
      <UIOverlay />
    </ErrorOverlay>
  );
}
