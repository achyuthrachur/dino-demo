'use client';

// =============================================================================
// Main Exhibit Page - Digital Museum: Infinite Mesozoic
// =============================================================================

import { Suspense, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { animate, createScope } from 'animejs';
import { useExhibitStore } from '@/lib/store';
import { getSpecimenById } from '@/lib/registry';
import { useReducedMotion } from '@/lib/useReducedMotion';
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
  const headerRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (!headerRef.current || prefersReducedMotion) return;

    const scope = createScope({ root: headerRef.current }).add(() => {
      animate('.header-content', {
        opacity: [0, 1],
        translateY: [-20, 0],
        duration: 800,
        delay: 200,
        ease: 'outQuint',
      });
    });

    return () => scope.revert();
  }, [prefersReducedMotion]);

  return (
    <header
      ref={headerRef}
      className="absolute top-0 left-0 right-0 z-20 p-4 sm:p-6"
    >
      <div className="header-content flex items-start justify-between">
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
      </div>
    </header>
  );
}

// -----------------------------------------------------------------------------
// Left Sidebar (Placard)
// -----------------------------------------------------------------------------

function LeftSidebar() {
  const sidebarRef = useRef<HTMLDivElement>(null);
  const selectedSpecimenId = useExhibitStore((state) => state.selectedSpecimenId);
  const specimen = selectedSpecimenId ? getSpecimenById(selectedSpecimenId) : null;
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (!sidebarRef.current || prefersReducedMotion) return;

    const scope = createScope({ root: sidebarRef.current }).add(() => {
      animate('.sidebar-content', {
        opacity: [0, 1],
        translateX: [-30, 0],
        duration: 700,
        delay: 400,
        ease: 'outQuint',
      });
    });

    return () => scope.revert();
  }, [prefersReducedMotion]);

  if (!specimen) return null;

  return (
    <aside
      ref={sidebarRef}
      className="absolute left-4 sm:left-6 top-24 bottom-32 z-10 flex-col justify-center pointer-events-none hidden md:flex"
      aria-label="Specimen information"
    >
      <div className="sidebar-content pointer-events-auto">
        <Placard specimen={specimen} />
      </div>
    </aside>
  );
}

// -----------------------------------------------------------------------------
// Right Sidebar (Specimen Selector)
// -----------------------------------------------------------------------------

function RightSidebar() {
  const sidebarRef = useRef<HTMLDivElement>(null);
  const openCompareDrawer = useExhibitStore((state) => state.openCompareDrawer);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (!sidebarRef.current || prefersReducedMotion) return;

    const scope = createScope({ root: sidebarRef.current }).add(() => {
      animate('.sidebar-content', {
        opacity: [0, 1],
        translateX: [30, 0],
        duration: 700,
        delay: 500,
        ease: 'outQuint',
      });
    });

    return () => scope.revert();
  }, [prefersReducedMotion]);

  return (
    <aside
      ref={sidebarRef}
      className="absolute right-4 sm:right-6 top-24 z-10 w-64 pointer-events-none hidden md:block"
      aria-label="Specimen selection"
    >
      <div className="sidebar-content pointer-events-auto space-y-3">
        <SpecimenSelector />

        {/* Compare button */}
        <Button
          variant="outline"
          className="w-full glass"
          onClick={() => openCompareDrawer('deinonychus-antirrhopus')}
          aria-label="Compare specimen sizes"
        >
          <ArrowLeftRight className="h-4 w-4 mr-2" aria-hidden="true" />
          Compare Sizes
        </Button>
      </div>
    </aside>
  );
}

// -----------------------------------------------------------------------------
// Bottom Dock (Controls)
// -----------------------------------------------------------------------------

function BottomDock() {
  const dockRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (!dockRef.current || prefersReducedMotion) return;

    const scope = createScope({ root: dockRef.current }).add(() => {
      animate('.dock-content', {
        opacity: [0, 1],
        translateY: [30, 0],
        duration: 700,
        delay: 600,
        ease: 'outQuint',
      });
    });

    return () => scope.revert();
  }, [prefersReducedMotion]);

  return (
    <div
      ref={dockRef}
      className="absolute bottom-4 sm:bottom-6 left-4 sm:left-6 right-4 sm:right-6 z-10"
    >
      <div className="dock-content max-w-4xl mx-auto">
        <Controls />
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Main Page Export
// -----------------------------------------------------------------------------

export default function ExhibitPage() {
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
