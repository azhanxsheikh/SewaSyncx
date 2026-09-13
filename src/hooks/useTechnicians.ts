import { technicianJobHistory as fixtureTechnicianJobHistory, technicians } from '../fixtures/technicians.fixture';
import { useData } from '../context/DataProvider';
import type { Technician, TechnicianJobRecord } from '../types/domain';

/**
 * A general "browse all technicians" list has no real query behind it: RLS
 * lets any signed-in user read a *verified* technician_profiles row
 * (technician_profiles_select_verified), but that table has no name — a
 * technician's name only becomes visible through
 * `users_select_assigned_technician`, which requires the caller to actually
 * be the client of a request that technician is assigned to. There is no
 * "list of technicians with names" a client can query before being matched
 * to one, by design. Stays fixture-backed for that reason, not as an
 * oversight — see also useTechnicianProfile.ts.
 */
export function useTechnicians(): Technician[] {
  return technicians;
}

export { usePrimaryTechnician, useTechnicianProfile } from './useTechnicianProfile';

/**
 * Real query: a signed-in technician's own request history
 * (technician_id = auth.uid(), fully within requests_select_assigned_technician).
 */
export function useTechnicianJobHistory(): TechnicianJobRecord[] {
  const { ready, technicianJobHistory } = useData();
  return ready ? technicianJobHistory : [];
}
