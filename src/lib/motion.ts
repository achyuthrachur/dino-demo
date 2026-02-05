// Easing families from Motion Bible
export const EASING = {
  // Instant feedback for toggles/cursors
  snap: 'cubicBezier(0, 1, 0, 1)',
  // Smooth camera moves, carousel transitions
  glide: 'cubicBezier(0.4, 0, 0.2, 1)',
  // Heavy scaling, "thud" effects
  impact: 'cubicBezier(0.175, 0.885, 0.32, 1.275)',
  // Enter animations
  out: 'cubicBezier(0.16, 1, 0.3, 1)',
  // Exit animations
  in: 'cubicBezier(0.7, 0, 0.84, 0)',
  // Spring feel
  spring: 'cubicBezier(0.34, 1.56, 0.64, 1)',
} as const;

export const DURATION = {
  instant: 75,
  fast: 150,
  normal: 250,
  slow: 350,
  slower: 500,
} as const;

// Type-safe easing name
export type EasingName = keyof typeof EASING;
export type DurationName = keyof typeof DURATION;
