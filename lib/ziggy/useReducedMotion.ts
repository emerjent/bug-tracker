"use client";

import { useEffect, useState } from "react";

/**
 * Hook to detect user's reduced motion preference.
 * Respects both system preference and runtime changes.
 */

export function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    // Check initial preference
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mediaQuery.matches);

    // Listen for changes
    const handleChange = (event: MediaQueryListEvent) => {
      setReducedMotion(event.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return reducedMotion;
}

/**
 * Hook to get a CSS-in-JS style object that conditionally disables animations
 * based on reduced motion preference.
 */
export function useReducedMotionStyles() {
  const reducedMotion = useReducedMotion();

  return {
    transition: reducedMotion ? "none" : undefined,
    animation: reducedMotion ? "none" : undefined,
  } as React.CSSProperties;
}