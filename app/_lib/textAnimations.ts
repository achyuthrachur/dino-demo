/**
 * Three reusable anime.js text animation styles for FactsPanel.
 * Each style provides an entrance and exit function.
 *
 * All functions operate on DOM elements with these CSS classes:
 *   .chapter-title, .title-char   — title characters
 *   .underline-bar                — accent underline element
 *   .fact-line                    — each fact row
 *   .fact-char                    — per-character spans within facts
 *   .bullet-dot                   — diamond bullet markers
 *   .bullet-ring                  — expanding ring behind bullet (Fossil Decode only)
 *   .number-span                  — numeric value spans
 */

import { animate, stagger, createScope } from 'animejs';
import { DURATION_MS, EASING } from './motion';

// ═══════════════════════════════════════════════════════════════
// SHARED
// ═══════════════════════════════════════════════════════════════

export type AnimationStyle = 'fossilDecode' | 'museumEtch' | 'boneCascade';

export interface AnimationHandle {
  /** Cleanup — reverts anime.js scope */
  cleanup: () => void;
}

const SYMBOLS = ['█', '▓', '░', '◆', '◇', '▪', '▫', '⬡', '⬢'];

function randomSymbol(): string {
  return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
}

function random(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

// ═══════════════════════════════════════════════════════════════
// STYLE A — FOSSIL DECODE
// ═══════════════════════════════════════════════════════════════

export function fossilDecode(root: HTMLElement): AnimationHandle {
  const scope = createScope({ root });

  scope.add(() => {
    // Title chars scatter-converge
    animate('.title-char', {
      translateX: [() => random(-40, 40), 0],
      translateY: [() => random(-30, 30), 0],
      rotate: [() => random(-90, 90), 0],
      opacity: [0, 1],
      scale: [0.3, 1],
      delay: stagger(DURATION_MS.titleCharStagger, { from: 'center' }),
      duration: DURATION_MS.titleScatter,
      ease: EASING.animeStandard,
    });

    // Underline trace with glow
    animate('.underline-bar', {
      scaleX: [0, 1],
      opacity: [0, 1],
      duration: DURATION_MS.underlineTrace,
      ease: EASING.animeCinematic,
      delay: DURATION_MS.titleScatter * 0.6,
    });

    // Fact lines — decode from random symbols
    const factLines = root.querySelectorAll('.fact-line');
    factLines.forEach((line, lineIdx) => {
      const chars = line.querySelectorAll('.fact-char') as NodeListOf<HTMLElement>;
      const timers: number[] = [];

      chars.forEach((charEl, charIdx) => {
        const realChar = charEl.dataset.char || charEl.textContent || '';
        charEl.style.opacity = '0';
        let cycle = 0;

        const startDelay = window.setTimeout(() => {
          charEl.style.opacity = '1';
          const interval = window.setInterval(() => {
            charEl.textContent = randomSymbol();
            cycle++;
            if (cycle >= DURATION_MS.factDecodeIterations) {
              window.clearInterval(interval);
              charEl.textContent = realChar;
            }
          }, DURATION_MS.factDecodeChar);
          timers.push(interval);
        }, lineIdx * DURATION_MS.factLineStagger + charIdx * DURATION_MS.factCharStagger + DURATION_MS.titleScatter);

        timers.push(startDelay);
      });
    });

    // Bullet dots — ring pulse
    animate('.bullet-dot', {
      scale: [0, 1],
      opacity: [0, 1],
      duration: DURATION_MS.bulletPop,
      delay: stagger(DURATION_MS.factLineStagger, { start: DURATION_MS.titleScatter }),
    });

    animate('.bullet-ring', {
      scale: [1, 2.5],
      opacity: [0.6, 0],
      duration: DURATION_MS.bulletPulse,
      delay: stagger(DURATION_MS.factLineStagger, { start: DURATION_MS.titleScatter }),
      ease: EASING.animeCascade,
    });
  });

  return {
    cleanup: () => scope.revert(),
  };
}

export function fossilDecodeExit(root: HTMLElement): Promise<void> {
  return new Promise((resolve) => {
    const scope = createScope({ root });
    scope.add(() => {
      animate('.fact-char, .title-char', {
        translateX: () => random(-30, 30),
        translateY: () => random(-20, 20),
        opacity: 0,
        duration: DURATION_MS.exitDuration,
        delay: stagger(10, { from: 'last' }),
        ease: 'in(3)',
        onComplete: () => {
          scope.revert();
          resolve();
        },
      });
    });
  });
}

// ═══════════════════════════════════════════════════════════════
// STYLE B — MUSEUM ETCH
// ═══════════════════════════════════════════════════════════════

export function museumEtch(root: HTMLElement): AnimationHandle {
  const scope = createScope({ root });

  scope.add(() => {
    // Title — cursor sweep reveals chars
    const titleCursor = root.querySelector('.etch-cursor') as HTMLElement | null;
    if (titleCursor) {
      animate(titleCursor, {
        left: ['0%', '100%'],
        opacity: [1, 1, 0],
        duration: DURATION_MS.etchCursorSpeed,
        ease: EASING.animeEtch,
      });
    }

    animate('.title-char', {
      opacity: [0, 1],
      delay: stagger(DURATION_MS.etchCharStagger),
      duration: 50,
      ease: EASING.animeEtch,
    });

    // Underline — left to right trace
    animate('.underline-bar', {
      scaleX: [0, 1],
      opacity: [0, 1],
      duration: DURATION_MS.underlineTrace,
      ease: EASING.animeCinematic,
      delay: DURATION_MS.etchCursorSpeed * 0.8,
    });

    // Fact lines — each line gets a cursor sweep
    const factLines = root.querySelectorAll('.fact-line') as NodeListOf<HTMLElement>;
    factLines.forEach((line, lineIdx) => {
      const lineDelay = DURATION_MS.etchCursorSpeed + lineIdx * (DURATION_MS.factLineStagger + 50);

      const lineCursor = line.querySelector('.etch-cursor') as HTMLElement | null;
      if (lineCursor) {
        animate(lineCursor, {
          left: ['0%', '100%'],
          opacity: [1, 1, 0],
          duration: DURATION_MS.etchCursorSpeed * 0.8,
          ease: EASING.animeEtch,
          delay: lineDelay,
        });
      }

      animate(line.querySelectorAll('.fact-char'), {
        opacity: [0, 1],
        delay: stagger(15, { start: lineDelay }),
        duration: 30,
        ease: EASING.animeEtch,
      });
    });

    // Bullets — burn in with brightness
    animate('.bullet-dot', {
      scale: [0, 1],
      opacity: [0, 1],
      duration: DURATION_MS.bulletPop,
      delay: stagger(DURATION_MS.factLineStagger + 50, { start: DURATION_MS.etchCursorSpeed }),
    });

    // Number highlight after etch
    const totalEtchTime = DURATION_MS.etchCursorSpeed + factLines.length * (DURATION_MS.factLineStagger + 50);
    animate('.number-span', {
      color: ['var(--fg1)', 'var(--accent)', 'var(--fg1)'],
      duration: 600,
      delay: totalEtchTime,
    });
  });

  return {
    cleanup: () => scope.revert(),
  };
}

export function museumEtchExit(root: HTMLElement): Promise<void> {
  return new Promise((resolve) => {
    const scope = createScope({ root });
    scope.add(() => {
      animate('.title-char, .fact-char', {
        opacity: [1, 0],
        delay: stagger(10, { from: 'last' }),
        duration: 50,
        onComplete: () => {
          scope.revert();
          resolve();
        },
      });
    });
  });
}

// ═══════════════════════════════════════════════════════════════
// STYLE C — BONE CASCADE
// ═══════════════════════════════════════════════════════════════

export function boneCascade(root: HTMLElement): AnimationHandle {
  const scope = createScope({ root });

  scope.add(() => {
    // Title drops in with bounce
    animate('.chapter-title', {
      translateY: [-60, 8, 0],
      opacity: [0, 1],
      duration: DURATION_MS.cascadeDrop,
      ease: EASING.animeCascade,
    });

    // Underline expands from center
    animate('.underline-bar', {
      scaleX: [0, 1],
      opacity: [0, 1],
      duration: DURATION_MS.underlineTrace * 0.8,
      delay: 200,
      ease: EASING.animeStandard,
    });

    // Fact lines drop from above
    animate('.fact-line', {
      translateY: [-30, 3, 0],
      opacity: [0, 1],
      delay: stagger(120, { start: 300 }),
      duration: DURATION_MS.cascadeDrop * 0.8,
      ease: EASING.animeCascade,
    });

    // Bullet dots pop with overshoot
    animate('.bullet-dot', {
      scale: [0, 1.3, 1],
      opacity: [0, 1],
      duration: DURATION_MS.bulletPop * 1.5,
      delay: stagger(120, { start: 300 }),
      ease: EASING.animeCascade,
    });

    // Number shake on landing
    animate('.number-span', {
      translateX: [0, -3, 3, -2, 0],
      duration: 300,
      delay: 600,
      ease: EASING.animeDecode,
    });
  });

  return {
    cleanup: () => scope.revert(),
  };
}

export function boneCascadeExit(root: HTMLElement): Promise<void> {
  return new Promise((resolve) => {
    const scope = createScope({ root });
    scope.add(() => {
      animate('.fact-line', {
        translateY: [0, 50],
        opacity: [1, 0],
        delay: stagger(60),
        duration: 250,
        ease: 'in(3)',
      });

      animate('.chapter-title', {
        translateY: [0, -40],
        opacity: [1, 0],
        duration: 200,
        onComplete: () => {
          scope.revert();
          resolve();
        },
      });
    });
  });
}

// ═══════════════════════════════════════════════════════════════
// DISPATCHER
// ═══════════════════════════════════════════════════════════════

const ENTRANCE_MAP = {
  fossilDecode,
  museumEtch,
  boneCascade,
} as const;

const EXIT_MAP = {
  fossilDecode: fossilDecodeExit,
  museumEtch: museumEtchExit,
  boneCascade: boneCascadeExit,
} as const;

export function runEntrance(style: AnimationStyle, root: HTMLElement): AnimationHandle {
  return ENTRANCE_MAP[style](root);
}

export function runExit(style: AnimationStyle, root: HTMLElement): Promise<void> {
  return EXIT_MAP[style](root);
}
