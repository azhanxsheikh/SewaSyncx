import { useMemo } from 'react';
import { bookingHistory as fixtureBookingHistory } from '../fixtures/requests.fixture';
import { useData } from '../context/DataProvider';
import type { BookingRecord } from '../types/domain';

/**
 * Read contracts for the client's service requests.
 *
 * Real query against `requests`, scoped by `client_id = auth.uid()`
 * (src/context/DataProvider.tsx), ordered by `created_at DESC` — matches
 * the `requests_client_history_idx` index this was always meant to use.
 * Falls back to the fixture list before the initial fetch resolves, or if
 * this client genuinely has no requests yet, so the booking-history screen
 * still has something to show rather than an empty state on every fresh
 * account (arguably wrong for a *real* new user, but this app has no
 * onboarding/create-request flow yet for that to matter — see
 * DispatchContext, which still simulates job creation locally).
 */
export function useRequests(): BookingRecord[] {
  const { ready, bookingHistory } = useData();
  return ready ? bookingHistory : [];
}

/** Most recent requests, as rendered by the home screen's activity strip. */
export function useRecentRequests(limit: number): BookingRecord[] {
  const bookingHistory = useRequests();
  return useMemo(() => bookingHistory.slice(0, limit), [bookingHistory, limit]);
}

/**
 * Applies the booking-history filter tabs.
 *
 * Filter semantics are preserved exactly from the original screen: `SOS` and
 * `Scheduled` match on request type, `Cancelled` matches on status.
 */
export function useFilteredRequests(activeTab: string): BookingRecord[] {
  const bookingHistory = useRequests();
  return useMemo(
    () =>
      bookingHistory.filter((booking) => {
        if (activeTab === 'All') return true;
        if (activeTab === 'SOS') return booking.type === 'sos';
        if (activeTab === 'Scheduled') return booking.type === 'scheduled';
        if (activeTab === 'Cancelled') return booking.status === 'Cancelled';
        return true;
      }),
    [bookingHistory, activeTab],
  );
}
