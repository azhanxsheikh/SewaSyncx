import { useMemo } from 'react';
import { bookingHistory } from '../fixtures/requests.fixture';
import type { BookingRecord } from '../types/domain';

/**
 * Read contracts for the client's service requests.
 *
 * Target state: a Supabase query against `requests` scoped by
 * `client_id = auth.uid()`, ordered by `created_at DESC`
 * (index `requests_client_history_idx`, see `docs/DATABASE.md` §7.3).
 */

export function useRequests(): BookingRecord[] {
  return bookingHistory;
}

/** Most recent requests, as rendered by the home screen's activity strip. */
export function useRecentRequests(limit: number): BookingRecord[] {
  return useMemo(() => bookingHistory.slice(0, limit), [limit]);
}

/**
 * Applies the booking-history filter tabs.
 *
 * Filter semantics are preserved exactly from the original screen: `SOS` and
 * `Scheduled` match on request type, `Cancelled` matches on status.
 */
export function useFilteredRequests(activeTab: string): BookingRecord[] {
  return useMemo(
    () =>
      bookingHistory.filter((booking) => {
        if (activeTab === 'All') return true;
        if (activeTab === 'SOS') return booking.type === 'sos';
        if (activeTab === 'Scheduled') return booking.type === 'scheduled';
        if (activeTab === 'Cancelled') return booking.status === 'Cancelled';
        return true;
      }),
    [activeTab],
  );
}
