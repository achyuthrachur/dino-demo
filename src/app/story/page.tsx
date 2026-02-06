'use client';

// =============================================================================
// Story Tour Page - Scroll-driven T-Rex narrative experience
// =============================================================================

import { Suspense, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useExhibitStore } from '@/lib/store';
import { useTrexScrollTour } from '@/lib/useTrexScrollTour';
import { TREX_CHAPTERS } from '@/lib/trexStoryScript';
import type { ChapterData } from '@/lib/trexStoryScript';
import { SceneErrorBoundary } from '@/components/ErrorBoundary';
import { ChapterIndicator, BootSequence, ScrollPrompt, ScanFrame, StrengthMeter } from '@/components/story';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

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
// Chapter Overlay - Renders a single chapter's narrative content
// -----------------------------------------------------------------------------

function ChapterOverlay({
  chapter,
  index,
}: {
  chapter: ChapterData;
  index: number;
}) {
  return (
    <section
      id={chapter.id}
      data-chapter-index={index}
      className={`chapter-section min-h-screen flex items-center relative ${index === 0 ? 'chapter-visible' : ''}`}
    >
      <div className="max-w-md mx-auto px-6 py-20 md:ml-12 lg:ml-20 pointer-events-auto">
        <div className="glass-strong rounded-xl p-6 space-y-4 relative overflow-hidden">
          {/* Scan frame for boot chapter */}
          {chapter.id === 'boot' && <ScanFrame />}

          {/* Subtitle */}
          {chapter.subtitle && (
            <span className="font-mono text-xs text-accent uppercase tracking-wider">
              {chapter.subtitle}
            </span>
          )}

          {/* Title */}
          <h2
            className="font-display text-3xl font-bold"
            style={{ color: '#84cc16' }}
          >
            {chapter.title}
          </h2>

          {/* Body paragraphs */}
          {chapter.body.map((p, i) => (
            <p
              key={i}
              className="font-body text-sm text-muted-foreground leading-relaxed"
            >
              {p}
            </p>
          ))}

          {/* Stats chips */}
          {chapter.stats && (
            <div className="flex flex-wrap gap-3 mt-4">
              {chapter.stats.map((s, i) => (
                <div key={i} className="glass rounded-lg px-3 py-2">
                  <span className="font-mono text-xs text-muted-foreground uppercase">
                    {s.label}
                  </span>
                  <div className="font-display text-xl text-foreground">
                    {s.value}
                    <span className="text-sm text-muted-foreground ml-1">
                      {s.unit}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Strength meter for forelimb chapter */}
          {chapter.id === 'forelimb' && (
            <div className="mt-4">
              <StrengthMeter label="Curl Strength" value={430} max={500} color="#f59e0b" />
            </div>
          )}

          {/* Myth / Correction */}
          {chapter.myth && (
            <div className="mt-4 space-y-2">
              <div className="glass rounded-lg p-3 border-l-2 border-laser/50">
                <span className="font-mono text-xs text-laser uppercase">
                  Myth
                </span>
                <p className="font-body text-sm text-muted-foreground mt-1">
                  {chapter.myth}
                </p>
              </div>
              {chapter.correction && (
                <div className="glass rounded-lg p-3 border-l-2 border-scientific/50">
                  <span className="font-mono text-xs text-scientific uppercase">
                    Reality
                  </span>
                  <p className="font-body text-sm text-foreground mt-1">
                    {chapter.correction}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Sources / Citations */}
          {chapter.sources && (
            <div className="space-y-2 mt-4">
              {chapter.sources.map((src, i) => (
                <div key={i} className="font-mono text-xs text-muted-foreground">
                  {src.author && <span>{src.author} </span>}
                  {src.year && <span>({src.year}) </span>}
                  <em>{src.title}</em>
                  {src.url && (
                    <a
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent ml-1"
                    >
                      [link]
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Call-to-action */}
          {chapter.cta && (
            <Link
              href={chapter.cta.href}
              className="inline-block mt-4 px-6 py-3 glass btn-neon-hover rounded-lg font-display text-sm text-foreground"
            >
              {chapter.cta.label}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
// Story Page Export
// -----------------------------------------------------------------------------

export default function StoryPage() {
  // Detect reduced motion preference
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Force T-Rex selection on mount
  useEffect(() => {
    useExhibitStore.getState().setSelectedSpecimen('tyrannosaurus-rex');
  }, []);

  // Scroll-driven tour engine
  const { currentChapter, progress } = useTrexScrollTour({ reducedMotion });

  return (
    <main className="relative">
      {/* Fixed 3D Canvas - stays pinned during scroll */}
      <div className="fixed inset-0 z-0">
        <SceneErrorBoundary>
          <Suspense fallback={<SceneLoader />}>
            <Scene />
          </Suspense>
        </SceneErrorBoundary>
      </div>

      {/* Navigation header */}
      <header className="fixed top-0 left-0 right-0 z-20 p-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 glass rounded-lg px-4 py-2 font-body text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Explore
        </Link>
      </header>

      {/* HUD Overlays */}
      <ChapterIndicator
        current={currentChapter + 1}
        total={TREX_CHAPTERS.length}
        progress={progress}
      />
      <BootSequence visible={currentChapter === 0} />
      {currentChapter === 0 && <ScrollPrompt />}

      {/* Scrollable chapter column */}
      <div className="relative z-10 pointer-events-none">
        {TREX_CHAPTERS.map((chapter, index) => (
          <ChapterOverlay key={chapter.id} chapter={chapter} index={index} />
        ))}
      </div>
    </main>
  );
}
