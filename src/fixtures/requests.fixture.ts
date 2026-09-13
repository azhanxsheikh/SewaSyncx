import type { BookingRecord, TimelineStage, TrackingStage } from '../types/domain';
import type { ExecutionStep } from '../types/dispatch';
import { mappedBookingHistory } from '../mocks/fixtures';

/** Client booking history. Maps to `requests` joined with `invoices` and `reviews`. Derived from canonical DB fixtures. */
export const bookingHistory: BookingRecord[] = mappedBookingHistory;

/** Filter tabs on the client booking-history screen. */
export const bookingFilterTabs: string[] = ['All', 'SOS', 'Scheduled', 'Cancelled'];

/** In-service timeline. Maps to `request_status_events`. */
export const serviceTimelineStages: TimelineStage[] = [
  { label: 'Technician arrived', time: '2:42 PM', done: true },
  { label: 'Diagnosing issue...', time: '2:45 PM', done: true, active: false },
  { label: 'Repair in progress', time: '2:52 PM', done: false, active: true },
  { label: 'Repair completed', time: '--', done: false },
];

/** Coarse progress markers on the live-tracking header. */
export const trackingStages: TrackingStage[] = [
  { label: 'Assigned', done: true },
  { label: 'On the way', done: true, active: true },
  { label: 'Arriving', done: false },
  { label: 'Arrived', done: false },
];

/**
 * Technician execution console steps.
 *
 * `id` maps to the canonical lifecycle states documented in
 * `docs/WORKFLOWS.md` §1 (`accepted` → `en_route` → `arrived` → `in_progress` → `completed`).
 */
export const executionSteps: { id: ExecutionStep; label: string; detail: string }[] = [
  { id: 'accepted', label: 'Accepted', detail: 'Job accepted' },
  { id: 'en-route', label: 'En route', detail: 'Heading to customer' },
  { id: 'arrived', label: 'Arrived', detail: 'At the service address' },
  { id: 'in-progress', label: 'Working', detail: 'Repair in progress' },
  { id: 'completed', label: 'Completed', detail: 'Close out the job' },
];

/** Work-completed checklist on the job-completion summary. */
export const completedWorkItems: string[] = [
  'Diagnosed main switchboard fault',
  'Replaced 2× faulty MCB units (16A)',
  'Tested all power circuits',
  'Restored full power to home',
];
