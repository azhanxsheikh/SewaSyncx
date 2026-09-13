import { useMemo } from 'react';
import { technicians } from '../fixtures/technicians.fixture';
import type { Technician } from '../types/domain';

/**
 * Resolves a technician profile by id.
 *
 * Fixture-backed, not a shortcut: a client can only ever see a technician's
 * name once actually assigned to one of their requests
 * (users_select_assigned_technician), and DispatchContext's `technicianId`
 * here is still a locally-simulated id ("t1"), never a real request's
 * technician_id — so a real query by this id would always return nothing.
 * Wiring the query itself is straightforward once request creation and
 * assignment are real; the id this hook receives is the actual gap.
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
