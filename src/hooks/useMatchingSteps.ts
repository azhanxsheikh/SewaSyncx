import { useMemo } from 'react';

export interface MatchingStep {
  icon: string;
  label: string;
  done: boolean;
}

/**
 * Provides animated progress steps during the technician discovery phase.
 */
export function useMatchingSteps(elapsed: number, radius = 10): MatchingStep[] {
  return useMemo(
    () => [
      {
        icon: '📍',
        label: `Locating nearby technicians (${radius} km radius)`,
        done: elapsed > 1,
      },
      {
        icon: '⭐',
        label: 'Verifying credentials & ratings',
        done: elapsed > 3,
      },
      {
        icon: '⚡',
        label: 'Sending emergency dispatch request',
        done: elapsed > 5,
      },
    ],
    [elapsed, radius],
  );
}
