/**
 * Domain entity contracts for the prototype's fixture layer.
 *
 * Each interface is annotated with the table it maps to in `docs/DATABASE.md`.
 * These are deliberately the *view-model* shape the current screens consume,
 * not a literal mirror of the SQL schema — the Frontend & Integration Agent
 * (see `AGENTS.md`) is responsible for reconciling the two when the Supabase
 * client replaces the fixtures behind the hooks in `src/hooks/`.
 *
 * Known divergences from the database schema are marked `SCHEMA-GAP`.
 */

// ---------------------------------------------------------------------------
// Service catalogue
// ---------------------------------------------------------------------------

/** Maps to `service_categories` (emergency pricing columns). */
export interface ServiceCategory {
  id: string;
  icon: string;
  name: string;
  description: string;
  basePrice: number;
  emergencyFee: number;
  /** SCHEMA-GAP: presentation-only Tailwind token, deliberately not persisted. */
  color: string;
}

/** Maps to `service_categories` filtered by `supports_scheduled`. */
export interface ScheduledCategory {
  id: string;
  icon: string;
  name: string;
  /** Display-only "from" price; the schema derives this as MIN(offering.price). */
  price: number;
}

/** Maps to `service_offerings`. */
export interface ServiceOffering {
  name: string;
  price: number;
  /**
   * SCHEMA-GAP: the schema stores `duration_min_minutes` / `duration_max_minutes`
   * as integers. The prototype renders a pre-formatted range string.
   */
  duration: string;
  desc: string;
}

/** Maps to `requests.priority` (`request_priority` enum) plus presentation copy. */
export interface PriorityLevel {
  id: string;
  label: string;
  emoji: string;
  title: string;
  description: string;
  eta: string;
  bg: string;
  border: string;
  labelBg: string;
  labelText: string;
  etaColor: string;
}

/** Maps to `request_answers` — the question side of the diagnostic triage. */
export interface DiagnosticQuestion {
  q: string;
  opts: string[];
}

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------

/** Maps to `users` + `technician_profiles`. */
export interface Technician {
  id: string;
  name: string;
  photo: string;
  rating: number;
  jobs: number;
  distance: string;
  eta: string;
  vehicle: string;
  category: string;
  phone: string;
  verified: boolean;
  identityVerified: boolean;
  skillVerified: boolean;
  backgroundChecked: boolean;
  experience: string;
}

/** Maps to `family_members`. */
export interface FamilyMember {
  id: string;
  name: string;
  relation: string;
  emoji: string;
  address: string;
  area: string;
  phone: string;
  color: string;
  latitude?: number;
  longitude?: number;
}

/** Maps to `saved_addresses`. */
export interface SavedAddress {
  id: string;
  label: string;
  icon: string;
  address: string;
  area: string;
  addressLine1?: string;
  addressLine2?: string;
  landmark?: string;
  city?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  isDefault?: boolean;
}

/** Aggregate counters rendered on the profile screen. */
export interface ClientStats {
  servicesUsed: number;
  sosUsed: number;
  averageRating: number;
}

// ---------------------------------------------------------------------------
// Requests and execution
// ---------------------------------------------------------------------------

/** Maps to `requests` joined with `invoices` for the history list. */
export interface BookingRecord {
  id: string;
  service: string;
  icon: string;
  technician: string;
  date: string;
  status: string;
  amount: string;
  /** `'sos'` ⇔ `scheduled_at IS NULL`; `'scheduled'` ⇔ `scheduled_at IS NOT NULL`. */
  type: string;
  rating: number;
  description?: string;
  priority?: string;
  estimatedTotal?: number;
  photos?: string[];
  rawStatus?: string;
}

/** Maps to `request_status_events` rendered as a client-facing timeline. */
export interface TimelineStage {
  label: string;
  time: string;
  done: boolean;
  active?: boolean;
}

/** Coarse progress markers on the live tracking header. */
export interface TrackingStage {
  label: string;
  done: boolean;
  active?: boolean;
}

/** Technician-side job history row; maps to `requests` filtered by `technician_id`. */
export interface TechnicianJobRecord {
  id: string;
  service: string;
  customer: string;
  date: string;
  amount: string;
  status: string;
}

// ---------------------------------------------------------------------------
// Billing
// ---------------------------------------------------------------------------

/** Maps to `payments.method` (`payment_method` enum) plus presentation copy. */
export interface PaymentMethodOption {
  id: string;
  label: string;
  icon: string;
  desc: string;
}

/** Maps to `invoice_line_items`. */
export interface InvoiceLineItem {
  desc: string;
  amount: number;
}

/** Maps to `request_cost_additions` — the approval-gated variance record. */
export interface AdditionalWorkRequest {
  reason: string;
  tags: string[];
  originalEstimate: number;
  addedLabel: string;
  addedSublabel: string;
  addedAmount: number;
  newTotal: number;
}

// ---------------------------------------------------------------------------
// Messaging and notifications
// ---------------------------------------------------------------------------

/** Maps to `notifications`. */
export interface NotificationRecord {
  id: string;
  title: string;
  time: string;
  read: boolean;
  icon: string;
}

/** Maps to `chat_messages`; `sender` maps to the `chat_sender_role` enum. */
export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  time: string;
}

// ---------------------------------------------------------------------------
// Static presentation content
// ---------------------------------------------------------------------------

/** Navigation shortcut tile on the home screen. */
export interface ServiceShortcut {
  icon: string;
  name: string;
  id: string;
}

/** Value-proposition tile. */
export interface PlatformFeature {
  icon: string;
  text: string;
}

/** Numbered explainer step. */
export interface HowItWorksStep {
  n: string;
  t: string;
  d: string;
}

/** Settings / support list row. */
export interface MenuItem {
  icon: string;
  label: string;
  desc: string;
}
