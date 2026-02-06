'use client';

// =============================================================================
// StoryHUD.tsx - UI Overlay Components for Scroll-Driven T-Rex Tour
// =============================================================================
// These components render the HUD layer for the story experience.
// Animations are handled externally via anime.js — components just expose
// the correct class names and DOM structure for targeting.

import { cn } from '@/lib/utils';

// -----------------------------------------------------------------------------
// ScanFrame - SVG border that draws on via stroke-dashoffset animation
// -----------------------------------------------------------------------------

interface ScanFrameProps {
  className?: string;
}

export function ScanFrame({ className }: ScanFrameProps) {
  return (
    <svg
      className={cn('scan-frame absolute inset-0 pointer-events-none', className)}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <rect
        x="1"
        y="1"
        width="98"
        height="98"
        rx="4"
        fill="none"
        stroke="#f59e0b"
        strokeWidth="0.5"
        strokeDasharray="400"
        strokeDashoffset="400"
        className="scan-frame-path"
      />
    </svg>
  );
}

// -----------------------------------------------------------------------------
// ChapterIndicator - Shows current chapter and scroll progress
// -----------------------------------------------------------------------------

interface ChapterIndicatorProps {
  current: number;
  total: number;
  progress: number;
}

export function ChapterIndicator({ current, total, progress }: ChapterIndicatorProps) {
  return (
    <div className="chapter-indicator fixed right-6 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-3">
      {/* Chapter label */}
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        Ch
      </span>

      {/* Vertical dot rail */}
      <div className="relative flex flex-col items-center gap-2">
        {Array.from({ length: total }, (_, i) => {
          const chapterIndex = i + 1;
          const isActive = chapterIndex === current;
          const isPast = chapterIndex < current;

          return (
            <button
              key={chapterIndex}
              className={cn(
                'chapter-dot relative h-3 w-3 rounded-full border transition-all duration-300',
                isActive
                  ? 'border-[#f59e0b] bg-[#f59e0b] shadow-[0_0_8px_rgba(245,158,11,0.6)]'
                  : isPast
                    ? 'border-[#f59e0b]/50 bg-[#f59e0b]/30'
                    : 'border-white/20 bg-white/5'
              )}
              aria-label={`Chapter ${chapterIndex}`}
              aria-current={isActive ? 'step' : undefined}
            >
              {isActive && (
                <span className="absolute -left-6 top-1/2 -translate-y-1/2 font-mono text-[10px] text-[#f59e0b]">
                  {String(chapterIndex).padStart(2, '0')}
                </span>
              )}
            </button>
          );
        })}

        {/* Progress line behind dots */}
        <div className="absolute left-1/2 top-0 -translate-x-1/2 h-full w-px bg-white/10 -z-10" />
        <div
          className="absolute left-1/2 top-0 -translate-x-1/2 w-px bg-[#f59e0b]/60 -z-10 origin-top transition-transform duration-150"
          style={{ height: '100%', transform: `scaleY(${Math.min(progress, 1)})` }}
        />
      </div>

      {/* Fraction label */}
      <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
        {current}/{total}
      </span>
    </div>
  );
}

// -----------------------------------------------------------------------------
// BootSequence - System boot HUD for the opening chapter
// -----------------------------------------------------------------------------

interface BootSequenceProps {
  visible: boolean;
}

const BOOT_LINES = [
  { text: '> SYSTEM INIT...', color: 'text-muted-foreground' },
  { text: '> LOADING SPECIMEN: T.REX', color: 'text-foreground' },
  { text: '> GEOLOGICAL PERIOD: LATE CRETACEOUS', color: 'text-foreground' },
  { text: '> SCAN MODE: SKELETON', color: 'text-[#84cc16]' },
  { text: '> ALL SYSTEMS NOMINAL', color: 'text-[#84cc16]' },
  { text: '> READY', color: 'text-[#f59e0b]' },
];

export function BootSequence({ visible }: BootSequenceProps) {
  return (
    <div
      className={cn(
        'boot-sequence fixed left-8 bottom-24 z-40 max-w-sm',
        !visible && 'pointer-events-none'
      )}
      aria-hidden={!visible}
    >
      <div className="glass rounded-lg px-5 py-4 space-y-1.5">
        {/* Terminal header bar */}
        <div className="flex items-center gap-2 pb-2 mb-2 border-b border-white/10">
          <span className="h-2 w-2 rounded-full bg-[#ef4444]" />
          <span className="h-2 w-2 rounded-full bg-[#f59e0b]" />
          <span className="h-2 w-2 rounded-full bg-[#84cc16]" />
          <span className="font-mono text-[10px] text-muted-foreground ml-2 uppercase tracking-wider">
            paleo-os v4.2
          </span>
        </div>

        {/* Boot lines - each is individually targetable for stagger animation */}
        {BOOT_LINES.map((line, i) => (
          <span
            key={i}
            className={cn(
              'boot-line block font-mono text-sm leading-relaxed opacity-0',
              line.color
            )}
            style={{ willChange: 'opacity, transform' }}
          >
            {line.text}
          </span>
        ))}

        {/* Cursor blink */}
        <span className="boot-cursor inline-block w-2 h-4 bg-[#f59e0b] opacity-0" />
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// StrengthMeter - Horizontal bar meter with neon glow
// -----------------------------------------------------------------------------

interface StrengthMeterProps {
  label: string;
  value: number;
  max: number;
  color?: string;
}

export function StrengthMeter({
  label,
  value,
  max,
  color = '#f59e0b',
}: StrengthMeterProps) {
  const percentage = Math.min((value / max) * 100, 100);

  return (
    <div className="strength-meter space-y-1.5">
      {/* Label row */}
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span
          className="font-mono text-xs tabular-nums"
          style={{ color }}
        >
          {value.toLocaleString()} / {max.toLocaleString()}
        </span>
      </div>

      {/* Track */}
      <div className="relative h-2 w-full rounded-full overflow-hidden bg-white/5 border border-white/10">
        {/* Fill */}
        <div
          className="strength-meter-fill absolute inset-y-0 left-0 rounded-full transition-[width] duration-500"
          style={{
            width: `${percentage}%`,
            backgroundColor: color,
            boxShadow: `0 0 10px ${color}80, 0 0 20px ${color}40`,
          }}
        />
        {/* Glow edge */}
        <div
          className="absolute inset-y-0 w-1 rounded-full blur-sm"
          style={{
            left: `${percentage}%`,
            backgroundColor: color,
            opacity: percentage > 0 ? 0.8 : 0,
            transform: 'translateX(-50%)',
          }}
        />
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// ScrollPrompt - "Scroll down" indicator for the opening screen
// -----------------------------------------------------------------------------

export function ScrollPrompt() {
  return (
    <div className="scroll-prompt fixed bottom-8 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-2">
      {/* Label */}
      <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
        Scroll
      </span>

      {/* Animated chevrons */}
      <div className="flex flex-col items-center gap-0.5">
        <svg
          className="scroll-chevron w-5 h-5 text-[#f59e0b] opacity-80"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
        <svg
          className="scroll-chevron w-5 h-5 text-[#f59e0b] opacity-40"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Subtle pulse line */}
      <div className="w-px h-8 bg-gradient-to-b from-[#f59e0b]/40 to-transparent" />
    </div>
  );
}
