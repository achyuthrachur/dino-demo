'use client';

// =============================================================================
// Main Exhibit Page - Digital Museum: Infinite Mesozoic
// =============================================================================

import { Suspense, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { useExhibitStore } from '@/lib/store';
import { getSpecimenById } from '@/lib/registry';
import {
  Controls,
  Placard,
  SpecimenSelector,
  CompareDrawer,
  PresenterHUD,
  MobileMenuButton,
  MobilePlacard,
} from '@/components/exhibit';
import { SceneErrorBoundary } from '@/components/ErrorBoundary';
import { Button } from '@/components/ui/button';
import { ArrowLeftRight, Info, Github } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// -----------------------------------------------------------------------------
// Dynamic Import for 3D Scene (Client-only)
// -----------------------------------------------------------------------------

const Scene = dynamic(
  () => import('@/components/canvas/Scene').then((mod) => mod.Scene),
  {
    ssr: false,
    loading: () => <SceneLoader />,
  }
);

const BoneFocusOverlay = dynamic(
  () => import('@/components/canvas/BoneFocus').then((mod) => mod.BoneFocusOverlay),
  { ssr: false }
);

// -----------------------------------------------------------------------------
// Scene Loading Placeholder
// -----------------------------------------------------------------------------

function SceneLoader() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-background to-stone-900">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 border-2 border-accent/30 rounded-full animate-ping motion-reduce:animate-none" />
          <div className="absolute inset-2 border-2 border-accent rounded-full animate-pulse motion-reduce:animate-none" />
        </div>
        <span className="font-mono text-sm text-muted-foreground">
          Loading exhibit...
        </span>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Header
// -----------------------------------------------------------------------------

function Header() {
  return (
    <header className="absolute top-0 left-0 right-0 z-20 p-4 sm:p-6">
      <motion.div
        className="flex items-start justify-between"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Logo/Title */}
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Infinite Mesozoic
          </h1>
          <p className="font-mono text-xs text-muted-foreground mt-1">
            Digital Museum Exhibit
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="glass"
                aria-label="About this exhibit"
              >
                <Info className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>About this exhibit</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="glass" asChild>
                <a
                  href="https://github.com/achyuthrachur/dino-museum"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="View source code on GitHub"
                >
                  <Github className="h-4 w-4" />
                </a>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>View source</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </motion.div>
    </header>
  );
}

// -----------------------------------------------------------------------------
// Left Sidebar (Placard)
// -----------------------------------------------------------------------------

function LeftSidebar() {
  const selectedSpecimenId = useExhibitStore((state) => state.selectedSpecimenId);
  const specimen = selectedSpecimenId ? getSpecimenById(selectedSpecimenId) : null;

  if (!specimen) return null;

  return (
    <aside
      className="absolute left-4 sm:left-6 top-24 bottom-32 z-10 flex-col justify-center pointer-events-none hidden md:flex"
      aria-label="Specimen information"
    >
      <motion.div
        className="pointer-events-auto"
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <Placard specimen={specimen} />
      </motion.div>
    </aside>
  );
}

// -----------------------------------------------------------------------------
// Right Sidebar (Specimen Selector)
// -----------------------------------------------------------------------------

function RightSidebar() {
  const openCompareDrawer = useExhibitStore((state) => state.openCompareDrawer);

  return (
    <aside
      className="absolute right-4 sm:right-6 top-24 z-10 w-64 pointer-events-none hidden md:block"
      aria-label="Specimen selection"
    >
      <motion.div
        className="pointer-events-auto space-y-3"
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <SpecimenSelector />

        {/* Compare button */}
        <Button
          variant="outline"
          className="w-full glass btn-neon-hover"
          onClick={() => openCompareDrawer('deinonychus-antirrhopus')}
          aria-label="Compare specimen sizes"
        >
          <ArrowLeftRight className="h-4 w-4 mr-2" aria-hidden="true" />
          Compare Sizes
        </Button>
      </motion.div>
    </aside>
  );
}

// -----------------------------------------------------------------------------
// Bottom Dock (Controls)
// -----------------------------------------------------------------------------

function BottomDock() {
  return (
    <div className="absolute bottom-4 sm:bottom-6 left-4 sm:left-6 right-4 sm:right-6 z-10">
      <motion.div
        className="max-w-4xl mx-auto"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <Controls />
      </motion.div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Main Page Export
// -----------------------------------------------------------------------------

export default function ExhibitPage() {
  const setPresenterActive = useExhibitStore((state) => state.setPresenterActive);
  const presenterActive = useExhibitStore((state) => state.presenterActive);

  // P key toggles presenter mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'p' || e.key === 'P') {
        // Don't trigger if user is typing in an input
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
        setPresenterActive(!presenterActive);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [presenterActive, setPresenterActive]);

  return (
    <main
      className="relative h-screen w-screen overflow-hidden"
      role="main"
      aria-label="Infinite Mesozoic digital museum exhibit"
    >
      {/* 3D Canvas - Full screen background */}
      <div
        className="absolute inset-0 z-0"
        role="img"
        aria-label="Interactive 3D dinosaur skeleton viewer"
      >
        <SceneErrorBoundary>
          <Suspense fallback={<SceneLoader />}>
            <Scene />
          </Suspense>
        </SceneErrorBoundary>
      </div>

      {/* UI Overlays */}
      <Header />
      <LeftSidebar />
      <RightSidebar />
      <MobileMenuButton />
      <MobilePlacard />
      <BottomDock />

      {/* Modals/Drawers */}
      <CompareDrawer />
      <PresenterHUD />

      {/* Bone focus overlay (claw mechanics) */}
      <BoneFocusOverlay />

      {/* Scan line effect overlay (for X-ray mode ambiance) */}
      <div
        className="absolute inset-0 pointer-events-none z-30 opacity-0 transition-opacity duration-500 scan-overlay"
        aria-hidden="true"
      />
    </main>
  );
}
