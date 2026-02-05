// =============================================================================
// useReducedMotion - Accessibility Hook for Motion Preferences
// =============================================================================

import { useState, useEffect } from 'react';

/**
 * Hook to detect if user prefers reduced motion
 * Returns true if user has enabled reduced motion in system settings
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    // Set initial value
    setPrefersReducedMotion(mediaQuery.matches);

    // Listen for changes
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }

    // Fallback for older browsers
    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  return prefersReducedMotion;
}

/**
 * Non-hook version for use outside React components
 * Checks once at call time
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Helper to get animation duration based on reduced motion preference
 * Returns 0 if reduced motion is preferred
 */
export function getAnimationDuration(duration: number, reducedMotion: boolean): number {
  return reducedMotion ? 0 : duration;
}

/**
 * Helper to conditionally apply animation properties
 */
export function getAnimationProps(
  props: {
    duration?: number;
    delay?: number;
    [key: string]: unknown;
  },
  reducedMotion: boolean
): typeof props {
  if (reducedMotion) {
    return {
      ...props,
      duration: 0,
      delay: 0,
    };
  }
  return props;
}
