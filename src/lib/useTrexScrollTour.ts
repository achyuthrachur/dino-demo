'use client';

// =============================================================================
// useTrexScrollTour - Scroll-driven Story Engine (Anime.js v4)
// =============================================================================

import { useEffect, useRef, useCallback, useState } from 'react';
import {
  createTimeline,
  onScroll,
  animate,
  stagger,
  createDrawable,
  type Timeline,
} from 'animejs';
import { useExhibitStore } from './store';
import { TREX_CHAPTERS, type ChapterData } from './trexStoryScript';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface ScrollTourOptions {
  /** Enable reduced motion (skip scrub, use simple fades) */
  reducedMotion?: boolean;
}

interface ScrollTourReturn {
  /** Current chapter index (0-based) */
  currentChapter: number;
  /** Overall scroll progress 0-1 */
  progress: number;
  /** Cleanup function */
  cleanup: () => void;
}

// -----------------------------------------------------------------------------
// Chapter State Applicator
// -----------------------------------------------------------------------------

function applyChapterState(chapter: ChapterData) {
  const store = useExhibitStore.getState();
  store.setCameraTarget(chapter.state.cameraTarget);
  store.setScanMode(chapter.state.scanMode);
  store.setExplodeFactor(chapter.state.explodeFactor);
}

// -----------------------------------------------------------------------------
// Hook: useTrexScrollTour
// -----------------------------------------------------------------------------

export function useTrexScrollTour(options: ScrollTourOptions = {}): ScrollTourReturn {
  const { reducedMotion = false } = options;

  const [currentChapter, setCurrentChapter] = useState(0);
  const [progress, setProgress] = useState(0);
  const observersRef = useRef<Array<ReturnType<typeof onScroll>>>([]);
  const timelinesRef = useRef<Timeline[]>([]);

  // Apply initial state
  useEffect(() => {
    applyChapterState(TREX_CHAPTERS[0]);
  }, []);

  // Build scroll-linked chapter timelines
  useEffect(() => {
    if (reducedMotion) {
      // Reduced motion: use IntersectionObserver for simple state changes
      setupReducedMotion();
      return () => cleanupAll();
    }

    // Full motion: build per-chapter scroll-linked timelines
    setupFullMotion();

    return () => cleanupAll();
  }, [reducedMotion]);

  // -------------------------------------------------------------------------
  // Full Motion Setup (Anime.js scroll-linked timelines)
  // -------------------------------------------------------------------------

  const setupFullMotion = useCallback(() => {
    TREX_CHAPTERS.forEach((chapter, index) => {
      const sectionEl = document.getElementById(chapter.id);
      if (!sectionEl) return;

      // Create a timeline for this chapter's UI animations
      const tl = createTimeline({
        defaults: { ease: 'outQuint', duration: 600 },
        autoplay: false,
      });

      // Animate the glass card content
      const card = sectionEl.querySelector('.glass-strong, .glass');
      if (card) {
        tl.add(card, {
          opacity: [0, 1],
          translateY: [40, 0],
          duration: 800,
        }, 0);
      }

      // Animate chapter-specific elements
      switch (chapter.animation) {
        case 'splitText': {
          // Boot chapter: headline reveal + boot sequence lines
          const headline = sectionEl.querySelector('h2');
          if (headline) {
            tl.add(headline, {
              opacity: [0, 1],
              translateY: [20, 0],
              duration: 600,
            }, 200);
          }
          // Subtitle
          const subtitle = sectionEl.querySelector('.font-mono.text-xs');
          if (subtitle) {
            tl.add(subtitle, {
              opacity: [0, 1],
              translateX: [-10, 0],
              duration: 400,
            }, 100);
          }
          // Boot sequence lines (HUD component)
          const bootLines = document.querySelectorAll('.boot-line');
          if (bootLines.length > 0) {
            tl.add(bootLines, {
              opacity: [0, 1],
              translateX: [-8, 0],
              delay: stagger(120),
              duration: 300,
            }, 400);
          }
          // Boot cursor
          const bootCursor = document.querySelector('.boot-cursor');
          if (bootCursor) {
            tl.add(bootCursor, {
              opacity: [0, 1],
              duration: 200,
            }, 400 + bootLines.length * 120);
          }
          // Scan frame SVG drawable
          const scanFramePath = document.querySelector('.scan-frame-path');
          if (scanFramePath) {
            try {
              const drawable = createDrawable(scanFramePath as SVGGeometryElement);
              tl.add(drawable, {
                draw: ['0 0', '0 1'],
                duration: 1200,
                ease: 'inOutQuad',
              }, 200);
            } catch {
              // Fallback if createDrawable fails
            }
          }
          break;
        }
        case 'staggerChips': {
          const chips = sectionEl.querySelectorAll('.glass.rounded-lg');
          if (chips.length > 0) {
            tl.add(chips, {
              opacity: [0, 1],
              translateY: [20, 0],
              scale: [0.9, 1],
              delay: stagger(100),
              duration: 500,
            }, 300);
          }
          // Animate stat values
          const statValues = sectionEl.querySelectorAll('.font-display.text-xl');
          if (statValues.length > 0) {
            tl.add(statValues, {
              opacity: [0, 1],
              scale: [0.8, 1],
              delay: stagger(120),
              duration: 400,
            }, 500);
          }
          break;
        }
        case 'mythGlitch': {
          // Myth card slides from left with a slight "glitch" shake
          const mythCard = sectionEl.querySelector('.border-laser\\/50, .border-l-2');
          const allCards = sectionEl.querySelectorAll('.border-l-2');
          const mythEl = allCards[0];
          const realityEl = allCards[1];

          if (mythEl) {
            tl.add(mythEl, {
              opacity: [0, 1],
              translateX: [-30, 0],
              duration: 400,
            }, 200);
            // Glitch shake
            tl.add(mythEl, {
              translateX: [0, -3, 4, -2, 0],
              duration: 200,
              ease: 'linear',
            }, 600);
          }
          if (realityEl) {
            tl.add(realityEl, {
              opacity: [0, 1],
              translateX: [30, 0],
              duration: 500,
              ease: 'outBack',
            }, 700);
          }
          // Body text
          const paras = sectionEl.querySelectorAll('p');
          if (paras.length > 0) {
            tl.add(paras, {
              opacity: [0, 1],
              translateY: [10, 0],
              delay: stagger(60),
              duration: 400,
            }, 300);
          }
          break;
        }
        case 'citations': {
          const citations = sectionEl.querySelectorAll('.font-mono.text-xs');
          if (citations.length > 0) {
            tl.add(citations, {
              opacity: [0, 1],
              translateY: [10, 0],
              delay: stagger(150),
              duration: 400,
            }, 200);
          }
          break;
        }
        case 'reassemble': {
          // Final chapter: satisfying "come together" feel
          const cta = sectionEl.querySelector('.btn-neon-hover');
          const paras = sectionEl.querySelectorAll('p');
          if (paras.length > 0) {
            tl.add(paras, {
              opacity: [0, 1],
              translateY: [20, 0],
              delay: stagger(80),
              duration: 500,
            }, 200);
          }
          if (cta) {
            tl.add(cta, {
              opacity: [0, 1],
              scale: [0.9, 1],
              duration: 500,
              ease: 'outBack',
            }, 600);
          }
          break;
        }
        case 'blurbCard':
        case 'drawable':
        default: {
          // Subtitle accent
          const subtitle = sectionEl.querySelector('.font-mono.text-xs');
          if (subtitle) {
            tl.add(subtitle, {
              opacity: [0, 1],
              translateX: [-10, 0],
              duration: 400,
            }, 100);
          }
          // Body paragraphs with stagger
          const paras = sectionEl.querySelectorAll('p');
          if (paras.length > 0) {
            tl.add(paras, {
              opacity: [0, 1],
              translateY: [15, 0],
              delay: stagger(80),
              duration: 500,
            }, 300);
          }
          // Strength meter fill (for forelimb chapter)
          const meterFill = sectionEl.querySelector('.strength-meter-fill');
          if (meterFill) {
            tl.add(meterFill, {
              width: ['0%', (meterFill as HTMLElement).style.width || '100%'],
              duration: 800,
              ease: 'outExpo',
            }, 500);
          }
          break;
        }
      }

      timelinesRef.current.push(tl);

      // Link timeline to scroll using onScroll
      const scrollObserver = onScroll({
        target: sectionEl,
        enter: 'top bottom',
        leave: 'bottom top',
        onEnter: () => {
          setCurrentChapter(index);
          setProgress((index + 1) / TREX_CHAPTERS.length);
          applyChapterState(chapter);
          tl.play();
        },
        onLeave: () => {
          tl.pause();
        },
      });

      observersRef.current.push(scrollObserver);
    });
  }, []);

  // -------------------------------------------------------------------------
  // Reduced Motion Fallback
  // -------------------------------------------------------------------------

  const setupReducedMotion = useCallback(() => {
    // Use IntersectionObserver to detect chapters entering viewport
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = Number(entry.target.getAttribute('data-chapter-index'));
            if (!isNaN(index) && index < TREX_CHAPTERS.length) {
              setCurrentChapter(index);
              setProgress((index + 1) / TREX_CHAPTERS.length);
              applyChapterState(TREX_CHAPTERS[index]);

              // Simple fade-in via class toggle
              entry.target.classList.add('chapter-visible');
            }
          }
        });
      },
      { threshold: 0.3 }
    );

    TREX_CHAPTERS.forEach((chapter) => {
      const el = document.getElementById(chapter.id);
      if (el) observer.observe(el);
    });

    // Store observer for cleanup (wrap in a proxy that matches the expected type)
    // We'll clean up via a separate ref
    const cleanupFn = () => observer.disconnect();
    (observersRef.current as unknown as Array<{ revert: () => void }>).push({
      revert: cleanupFn,
    } as unknown as ReturnType<typeof onScroll>);
  }, []);

  // -------------------------------------------------------------------------
  // Cleanup
  // -------------------------------------------------------------------------

  const cleanupAll = useCallback(() => {
    observersRef.current.forEach((obs) => {
      if (obs && typeof obs.revert === 'function') {
        obs.revert();
      }
    });
    observersRef.current = [];

    timelinesRef.current.forEach((tl) => {
      if (tl && typeof tl.pause === 'function') {
        tl.pause();
      }
    });
    timelinesRef.current = [];
  }, []);

  return {
    currentChapter,
    progress,
    cleanup: cleanupAll,
  };
}
