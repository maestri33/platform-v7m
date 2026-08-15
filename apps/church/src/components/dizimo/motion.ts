import { useCallback, useMemo, useSyncExternalStore } from 'react';
import type { TargetAndTransition, Transition } from 'framer-motion';

type StepMotion = {
  initial: TargetAndTransition;
  animate: TargetAndTransition;
  exit: TargetAndTransition;
};

export const MOTION = Object.freeze({
  easeOut: [0.23, 1, 0.32, 1] as const,
  easeInOut: [0.77, 0, 0.175, 1] as const,
  pressScale: 0.97,
  pressDuration: 0.1,
  stepDuration: 0.25,
});

export const FINE_POINTER_HOVER_QUERY =
  '(hover: hover) and (pointer: fine)' as const;

export const STEP_MOTION: StepMotion = Object.freeze({
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
});

const REDUCED_STEP_MOTION: StepMotion = Object.freeze({
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
});

export const pressMotion = Object.freeze({
  scale: MOTION.pressScale,
  transition: { duration: MOTION.pressDuration },
});

export function uiTransition(reducedMotion: boolean | null): Transition {
  return reducedMotion
    ? { duration: 0.15 }
    : { duration: MOTION.stepDuration, ease: MOTION.easeOut };
}

export function stepMotion(reducedMotion: boolean | null): StepMotion {
  return reducedMotion ? REDUCED_STEP_MOTION : STEP_MOTION;
}

export function shouldAnimateHover(
  hasFinePointerHover: boolean,
  reducedMotion: boolean | null,
): boolean {
  return hasFinePointerHover && !reducedMotion;
}

export function useFinePointerHover(): boolean {
  const mediaQuery = useMemo(
    () =>
      typeof globalThis.matchMedia === 'function'
        ? globalThis.matchMedia(FINE_POINTER_HOVER_QUERY)
        : null,
    [],
  );
  const subscribe = useCallback(
    (onChange: () => void) => {
      mediaQuery?.addEventListener('change', onChange);
      return () => mediaQuery?.removeEventListener('change', onChange);
    },
    [mediaQuery],
  );
  const getSnapshot = useCallback(() => mediaQuery?.matches ?? false, [mediaQuery]);

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
