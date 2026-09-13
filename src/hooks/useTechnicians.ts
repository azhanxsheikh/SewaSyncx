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

export { usePrimaryTechnician, useTechnicianProfile } from './useTechnicianProfile';

export function useTechnicianJobHistory(): TechnicianJobRecord[] {
  return technicianJobHistory;
}
