import { useState, useCallback } from 'react';

export function usePrefersReducedMotion() {
  // simple mock for now, returns false
  return false;
}

export function useDotMatrixPhases({
  animated,
  hoverAnimated,
  speed: _speed
}: {
  animated: boolean;
  hoverAnimated: boolean;
  speed: number;
}) {
  const [phase, setPhase] = useState(animated ? 'active' : 'idle');

  const onMouseEnter = useCallback(() => {
    if (hoverAnimated) setPhase('active');
  }, [hoverAnimated]);

  const onMouseLeave = useCallback(() => {
    if (hoverAnimated && !animated) setPhase('idle');
  }, [hoverAnimated, animated]);

  return { phase, onMouseEnter, onMouseLeave };
}
