import { useMemo } from 'react';
import { technicians } from '../fixtures/technicians.fixture';
import type { Technician } from '../types/domain';

/**
 * Resolves a technician profile by id.
 *
 * Preserves synchronous fallback behaviour: returns `undefined` for an unknown
 * or unset id, so screens can render their "finding your technician" state
 * without blank screens or undefined errors.
 */
export function useTechnicianProfile(technicianId?: string): Technician | undefined {
  return useMemo(
    () => (technicianId ? technicians.find((technician) => technician.id === technicianId) : undefined),
    [technicianId],
  );
}

/**
 * Resolves the primary demo technician (Rahul Kumar), used by screens that predate
 * active dynamic assignment wiring.
 */
export function usePrimaryTechnician(): Technician {
  return technicians[0];
}
