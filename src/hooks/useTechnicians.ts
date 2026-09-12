import { useMemo } from 'react';
import { technicianJobHistory, technicians } from '../fixtures/technicians.fixture';
import type { Technician, TechnicianJobRecord } from '../types/domain';

/**
 * Read contracts for technician data.
 *
 * Target state: `useTechnicianProfile` becomes a Supabase query against
 * `users` joined with `technician_profiles`, scoped by the RLS policy that
 * lets a client read only the technician assigned to their own request
 * (see `docs/DATABASE.md` §12).
 */

export function useTechnicians(): Technician[] {
  return technicians;
}

/**
 * Resolves a technician by id.
 *
 * Returns `undefined` for an unknown id — callers already render a
 * "finding your technician" fallback for that case, so the behaviour is
 * preserved rather than substituting a default profile.
 */
export function useTechnicianProfile(technicianId?: string): Technician | undefined {
  return useMemo(
    () => (technicianId ? technicians.find((technician) => technician.id === technicianId) : undefined),
    [technicianId],
  );
}

/** The primary demo technician, used by screens that predate assignment wiring. */
export function usePrimaryTechnician(): Technician {
  return technicians[0];
}

export function useTechnicianJobHistory(): TechnicianJobRecord[] {
  return technicianJobHistory;
}
