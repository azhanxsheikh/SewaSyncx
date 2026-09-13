/**
 * Screen identifiers for the in-memory router in `src/App.tsx`.
 *
 * This is presentation routing state, not a domain entity — it has no
 * counterpart in `docs/DATABASE.md`. When the app migrates to Next.js
 * these become route segments.
 */
export type Screen =
  | 'home'
  | 'sos-service'
  | 'sos-priority'
  | 'sos-location'
  | 'sos-photo'
  | 'sos-questionnaire'
  | 'sos-pricing'
  | 'sos-confirmation'
  | 'sos-finding'
  | 'sos-assigned'
  | 'sos-tracking'
  | 'sos-chat'
  | 'sos-arrived'
  | 'sos-inprogress'
  | 'sos-additional-cost'
  | 'sos-completed'
  | 'sos-invoice'
  | 'sos-payment'
  | 'sos-rating'
  | 'family'
  | 'family-member'
  | 'scheduled-category'
  | 'scheduled-service'
  | 'scheduled-datetime'
  | 'scheduled-address'
  | 'scheduled-pricing'
  | 'scheduled-confirmation'
  | 'bookings'
  | 'profile'
  | 'notifications'
  | 'admin';
