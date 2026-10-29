import { useEffect, useRef } from 'react';
import gsap from 'gsap';

/**
 * Custom hook to safely run GSAP animations with proper React 19 lifecycle cleanup
 * using gsap.context() to prevent memory leaks and duplicate tweens.
 */
export function useGsapTimeline(
  animationCallback: (ctx: gsap.Context) => void,
  dependencies: unknown[] = []
) {
  const scopeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Respect user's reduced motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const ctx = gsap.context(() => {
      animationCallback(ctx);
    }, scopeRef);

    return () => {
      ctx.revert(); // Automatically cleans up all GSAP tweens/timelines created in this context
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  return scopeRef;
}

export { gsap };
