'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { useDirector } from '../_lib/director';
import { useStore } from '../_lib/store';
import { CHAPTERS } from '../_lib/tour';
import { splitText, extractNumbers } from '../_lib/textSplit';
import { runEntrance, runExit, type AnimationStyle, type AnimationHandle } from '../_lib/textAnimations';

/** Cycle through animation styles per chapter */
const STYLE_CYCLE: AnimationStyle[] = ['fossilDecode', 'museumEtch', 'boneCascade'];

export function FactsPanel() {
  const mode = useStore((s) => s.mode);
  const activeChapter = useDirector((s) => s.activeChapter);
  const phase = useDirector((s) => s.phase);

  const visible = mode === 'skeleton' && activeChapter >= 0 && phase !== 'home';
  const chapter = activeChapter >= 0 ? CHAPTERS[activeChapter] : null;

  const panelRef = useRef<HTMLDivElement>(null);
  const animHandle = useRef<AnimationHandle | null>(null);
  const prevChapter = useRef(-1);
  const [renderedChapter, setRenderedChapter] = useState(-1);

  const style = activeChapter >= 0
    ? STYLE_CYCLE[activeChapter % STYLE_CYCLE.length]
    : 'fossilDecode';

  // Handle chapter transitions: exit old → update content → enter new
  const runTransition = useCallback(async () => {
    if (!panelRef.current) return;

    // Exit previous animation if any
    if (animHandle.current) {
      animHandle.current.cleanup();
      animHandle.current = null;
    }

    if (prevChapter.current >= 0 && panelRef.current) {
      const prevStyle = STYLE_CYCLE[prevChapter.current % STYLE_CYCLE.length];
      await runExit(prevStyle, panelRef.current).catch(() => {});
    }

    // Update rendered content
    setRenderedChapter(activeChapter);
  }, [activeChapter]);

  // Trigger transition when chapter changes
  useEffect(() => {
    if (!visible || activeChapter < 0) {
      // Cleanup on hide
      if (animHandle.current) {
        animHandle.current.cleanup();
        animHandle.current = null;
      }
      prevChapter.current = -1;
      setRenderedChapter(-1);
      return;
    }

    if (activeChapter !== prevChapter.current) {
      runTransition();
      prevChapter.current = activeChapter;
    }
  }, [visible, activeChapter, runTransition]);

  // Run entrance animation after content renders
  useEffect(() => {
    if (renderedChapter < 0 || !panelRef.current) return;

    // Small delay to let DOM settle
    const timer = window.setTimeout(() => {
      if (!panelRef.current) return;
      const currentStyle = STYLE_CYCLE[renderedChapter % STYLE_CYCLE.length];
      animHandle.current = runEntrance(currentStyle, panelRef.current);
    }, 50);

    return () => window.clearTimeout(timer);
  }, [renderedChapter]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animHandle.current) {
        animHandle.current.cleanup();
        animHandle.current = null;
      }
    };
  }, []);

  if (!visible || !chapter) return null;

  const displayChapter = renderedChapter >= 0 ? CHAPTERS[renderedChapter] : chapter;
  if (!displayChapter) return null;

  return (
    <div
      ref={panelRef}
      className="glass-panel"
      style={{
        position: 'fixed',
        right: '1.5rem',
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 15,
        maxWidth: '20rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        animation: 'accent-glow-in 1.2s ease-out',
      }}
    >
      {/* Chapter title with split characters */}
      <h3
        className="chapter-title"
        style={{
          fontSize: '0.9rem',
          fontWeight: 700,
          color: 'var(--accent)',
          letterSpacing: '0.05em',
          marginBottom: '0.125rem',
          position: 'relative',
          whiteSpace: 'nowrap',
        }}
      >
        {/* Etch cursor (only used by museumEtch style) */}
        {style === 'museumEtch' && (
          <span
            className="etch-cursor"
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: '2px',
              height: '100%',
              background: 'var(--accent)',
              boxShadow: '0 0 8px var(--accent), 0 0 16px var(--accent)',
              opacity: 0,
              pointerEvents: 'none',
            }}
          />
        )}
        {splitText(displayChapter.title).map((c) => (
          <span
            key={c.index}
            className="title-char"
            style={{
              display: 'inline-block',
              whiteSpace: c.isSpace ? 'pre' : undefined,
              opacity: 0,
            }}
          >
            {c.isSpace ? '\u00A0' : c.char}
          </span>
        ))}
      </h3>

      {/* Accent underline */}
      <div
        className="underline-bar"
        style={{
          height: '2px',
          background: 'linear-gradient(to right, var(--accent), transparent)',
          marginBottom: '0.25rem',
          transformOrigin: style === 'boneCascade' ? 'center' : 'left',
          transform: 'scaleX(0)',
          opacity: 0,
        }}
      />

      {/* Fact lines */}
      {displayChapter.facts.map((fact, i) => (
        <FactLine key={`${displayChapter.id}-${i}`} fact={fact} style={style} />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════

interface FactLineProps {
  fact: string;
  style: AnimationStyle;
}

function FactLine({ fact, style }: FactLineProps) {
  const numbers = extractNumbers(fact);

  return (
    <div
      className="fact-line"
      style={{
        display: 'flex',
        gap: '0.5rem',
        alignItems: 'flex-start',
        position: 'relative',
        opacity: style === 'boneCascade' ? 0 : undefined,
      }}
    >
      {/* Bullet */}
      <span style={{ position: 'relative', flexShrink: 0, width: '0.6rem', height: '1.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span
          className="bullet-dot"
          style={{
            color: 'var(--accent)',
            fontSize: '0.6rem',
            position: 'relative',
            zIndex: 1,
            opacity: 0,
            transform: 'scale(0)',
          }}
        >
          &#9670;
        </span>
        {/* Ring pulse (Fossil Decode only) */}
        {style === 'fossilDecode' && (
          <span
            className="bullet-ring"
            style={{
              position: 'absolute',
              width: '0.6rem',
              height: '0.6rem',
              borderRadius: '50%',
              border: '1px solid var(--accent)',
              opacity: 0,
            }}
          />
        )}
      </span>

      {/* Text with split characters + etch cursor */}
      <span
        style={{
          fontSize: '0.8rem',
          color: 'var(--fg1)',
          lineHeight: 1.5,
          position: 'relative',
        }}
      >
        {style === 'museumEtch' && (
          <span
            className="etch-cursor"
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: '2px',
              height: '100%',
              background: 'var(--accent)',
              boxShadow: '0 0 6px var(--accent)',
              opacity: 0,
              pointerEvents: 'none',
            }}
          />
        )}
        {renderFactChars(fact, numbers, style)}
      </span>
    </div>
  );
}

/**
 * Render fact text as per-character spans, wrapping numeric spans with .number-span.
 */
function renderFactChars(fact: string, numbers: ReturnType<typeof extractNumbers>, style: AnimationStyle) {
  const chars = splitText(fact);
  const elements: React.ReactNode[] = [];
  let numSpanIdx = 0;
  let i = 0;

  while (i < chars.length) {
    const numSpan = numbers[numSpanIdx];

    if (numSpan && i === numSpan.start) {
      // Render number span wrapper
      const numChars = chars.slice(numSpan.start, numSpan.end);
      elements.push(
        <span key={`num-${i}`} className="number-span" data-value={numSpan.numericValue} style={{ color: 'var(--fg0)' }}>
          {numChars.map((c) => (
            <span
              key={c.index}
              className="fact-char"
              data-char={c.char}
              style={{
                display: 'inline-block',
                whiteSpace: c.isSpace ? 'pre' : undefined,
                opacity: style === 'boneCascade' ? undefined : 0,
              }}
            >
              {c.isSpace ? '\u00A0' : c.char}
            </span>
          ))}
        </span>
      );
      i = numSpan.end;
      numSpanIdx++;
    } else {
      const c = chars[i];
      elements.push(
        <span
          key={c.index}
          className="fact-char"
          data-char={c.char}
          style={{
            display: 'inline-block',
            whiteSpace: c.isSpace ? 'pre' : undefined,
            opacity: style === 'boneCascade' ? undefined : 0,
          }}
        >
          {c.isSpace ? '\u00A0' : c.char}
        </span>
      );
      i++;
    }
  }

  return elements;
}
