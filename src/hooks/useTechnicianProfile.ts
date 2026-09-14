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
  return useMemo(() => {
    if (!technicianId) return undefined;
    const found = technicians.find((technician) => technician.id === technicianId);
    if (found) return found;
    if (technicianId.length >= 10 || technicianId.includes('-')) {
      return {
        id: technicianId,
        name: 'Kevin',
        photo: 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=150',
        rating: 4.9,
        jobs: 64,
        distance: '1.8 km',
        eta: '12 min',
        vehicle: 'Two-Wheeler / Scooter',
        category: 'AC Repair',
        phone: '+91 95103 35730',
        verified: true,
        identityVerified: true,
        skillVerified: true,
        backgroundChecked: true,
        experience: '5 yrs exp',
      };
    }
    return undefined;
  }, [technicianId]);
}

/**
 * Resolves the primary demo technician (Rahul Kumar), used by screens that predate
 * active dynamic assignment wiring.
 */
export function usePrimaryTechnician(): Technician {
  return technicians[0];
}
