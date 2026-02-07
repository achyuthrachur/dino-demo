export const DURATION_MS = {
  uiFade: 220,
  uiSlide: 360,
  modeTransition: 900,
} as const;

export const EASING = {
  // Framer Motion: cubic-bezier arrays
  framerStandard: [0.2, 0.8, 0.2, 1] as const,
  framerSnappy: [0.3, 1, 0.3, 1] as const,

  // Anime.js: string values
  animeStandard: 'out(4)',
  animeSoft: 'out(2)',
} as const;

export const CAMERA = {
  idleRevolveRadPerSec: 0.25,
  damp: 0.08,
} as const;

export const STAGE_LOCKS = {
  modeSwitchLockMs: 900,
} as const;
