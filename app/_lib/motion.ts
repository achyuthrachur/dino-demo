export const DURATION_MS = {
  uiFade: 220,
  uiSlide: 360,
  modeTransition: 900,
  crossfade: 520,
  cameraDolly: 720,
  roarOneShot: 1400,
  transitionGuard: 950,
  // Stage 2 — Exhibit
  chapterCamera: 1200,
  explodeTransition: 800,
  factStagger: 100,
  factEntrance: 400,
  // Stage 2 — Polish
  titleEntrance: 300,
  titleUnderline: 500,
  hudStagger: 60,
  factExit: 250,
  bulletPop: 200,
} as const;

export const EASING = {
  // Framer Motion: cubic-bezier arrays
  framerStandard: [0.2, 0.8, 0.2, 1] as const,
  framerSnappy: [0.3, 1, 0.3, 1] as const,
  framerCinematic: [0.16, 1, 0.3, 1] as const,
  framerSpring: [0.34, 1.56, 0.64, 1] as const,

  // Anime.js: string values
  animeStandard: 'out(4)',
  animeSoft: 'out(2)',
  animeCinematic: 'out(5)',
  animeChapter: 'out(3)',
} as const;

export const SPRING_BUTTON = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 17,
};

export const CAMERA = {
  idleRevolveRadPerSec: 0.25,
  damp: 0.08,
  dollyZDelta: 1.5,
  dollyYDelta: 0.5,
} as const;

export const STAGE_LOCKS = {
  modeSwitchLockMs: 900,
} as const;
