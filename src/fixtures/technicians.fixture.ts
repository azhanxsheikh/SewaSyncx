import type { Technician, TechnicianJobRecord } from '../types/domain';
import {
  mappedTechnicianJobHistory,
  mappedTechnicians,
} from '../mocks/fixtures';

/** Maps to `users` joined with `technician_profiles`. Derived from canonical DB fixtures. */
export const technicians: Technician[] = mappedTechnicians;

/**
 * Technician-side completed work. Maps to `requests` filtered by `technician_id`.
 * Derived from canonical DB fixtures.
 */
export const technicianJobHistory: TechnicianJobRecord[] = mappedTechnicianJobHistory;

/** Filter tabs on the technician job-history screen. */
export const technicianHistoryFilters: string[] = ['All', 'Completed', 'Cancelled', 'Declined'];
