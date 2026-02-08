export const DURATION_MS = {
  uiFade: 220,
  uiSlide: 360,
  modeTransition: 900,
  crossfade: 520,
  cameraDolly: 720,
  roarOneShot: 1400,
  transitionGuard: 2800,
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

  // ── Text Animation: Fossil Decode ──
  titleScatter: 600,
  titleCharStagger: 30,
  factDecodeChar: 40,
  factDecodeIterations: 3,

  // ── Text Animation: Museum Etch ──
  etchCursorSpeed: 500,
  etchCharStagger: 20,

  // ── Text Animation: Bone Cascade ──
  cascadeDrop: 500,

  // ── Text Animation: Shared ──
  underlineTrace: 500,
  factLineStagger: 150,
  factCharStagger: 20,
  counterRoll: 1000,
  bulletPulse: 400,
  exitDuration: 300,

  // ── Skin Reveal ──
  skinRevealDuration: 2800,
  skinEdgeGlow: 200,

  // ── Leader Lines ──
  leaderDraw: 700,
  leaderBranchStagger: 120,
  leaderBranchDraw: 200,
  leaderDotPulse: 400,
  leaderExit: 300,
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

  // ── Text Animation ──
  animeDecode: 'out(2)',
  animeEtch: 'linear',
  animeCascade: 'out(3)',

  // ── Skin Reveal ──
  animeSkinReveal: 'linear',

  // ── Leader Lines ──
  animeLeaderDraw: 'out(4)',
} as const;

export const SPRING_BUTTON = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 17,
};

export const SKIN_REVEAL = {
  fadeDelay: 0.4, // skeleton starts fading at 40% reveal progress
} as const;

export const CAMERA = {
  idleRevolveRadPerSec: 0.25,
  damp: 0.08,
  dollyZDelta: 1.5,
  dollyYDelta: 0.5,
} as const;

export const STAGE_LOCKS = {
  modeSwitchLockMs: 900,
} as const;
