/**
 * @deprecated As of src/context/DataProvider.tsx, this is no longer the
 * primary data source for any screen — every hook that has a real
 * Supabase query behind it (see src/hooks/) reads from DataProvider first
 * and only falls back to the fixture data derived from this file when:
 * (a) the initial fetch hasn't resolved yet, (b) the signed-in user
 * genuinely has none of that data yet, or (c) no real query is possible at
 * all for that shape (useTechnicians() — see its own doc comment for why).
 *
 * Not deleted, because those fallbacks are real and depended-on, not dead
 * code — src/fixtures/*.fixture.ts still import from here for exactly
 * those cases. Do not add new features against this file; wire a real
 * query in DataProvider.tsx instead, the way the ones above already are.
 */
import type { Database } from '../types/database';
import type {
  AdditionalWorkRequest,
  BookingRecord,
  FamilyMember,
  InvoiceLineItem,
  SavedAddress,
  ScheduledCategory,
  ServiceCategory,
  ServiceOffering,
  Technician,
  TechnicianJobRecord,
} from '../types/domain';

export type UserRow = Database['public']['Tables']['users']['Row'];
export type TechnicianProfileRow = Database['public']['Tables']['technician_profiles']['Row'];
export type ServiceCategoryRow = Database['public']['Tables']['service_categories']['Row'];
export type ServiceOfferingRow = Database['public']['Tables']['service_offerings']['Row'];
export type RequestRow = Database['public']['Tables']['requests']['Row'];
export type FamilyMemberRow = Database['public']['Tables']['family_members']['Row'];
export type SavedAddressRow = Database['public']['Tables']['saved_addresses']['Row'];
export type InvoiceRow = Database['public']['Tables']['invoices']['Row'];
export type PaymentRow = Database['public']['Tables']['payments']['Row'];
export type CostAdditionRow = Database['public']['Tables']['request_cost_additions']['Row'];
export type ReviewRow = Database['public']['Tables']['reviews']['Row'];

// ---------------------------------------------------------------------------
// 1. Raw Database Mock Tables (Database['public']['Tables'][...]['Row'])
// ---------------------------------------------------------------------------

export const dbUsers: UserRow[] = [
  {
    id: 'u_client_1',
    name: 'Abdullah Khan',
    phone: '+91 99876 54321',
    email: 'abdullah.khan@gmail.com',
    role: 'client',
    preferred_language: 'en-IN',
    default_street_address: 'B-204, Gaur City 2',
    default_unit_floor: 'Flat B-204, 2nd Floor',
    default_location: null,
    created_at: '2026-01-10T09:30:00Z',
    updated_at: '2026-09-05T10:00:00Z',
  },
  {
    id: 't1',
    name: 'Rahul Kumar',
    phone: '+91 98765 43210',
    email: 'rahul.kumar.electrical@gmail.com',
    role: 'technician',
    preferred_language: 'hi-IN',
    default_street_address: 'Gali 4, Chhapraula',
    default_unit_floor: null,
    default_location: null,
    created_at: '2025-06-15T08:00:00Z',
    updated_at: '2026-09-05T14:40:00Z',
  },
  {
    id: 't2',
    name: 'Suresh Yadav',
    phone: '+91 98765 11234',
    email: 'suresh.yadav.plumbing@gmail.com',
    role: 'technician',
    preferred_language: 'hi-IN',
    default_street_address: 'Shahberi Road, Crossings Republik',
    default_unit_floor: null,
    default_location: null,
    created_at: '2025-08-20T10:15:00Z',
    updated_at: '2026-09-01T12:00:00Z',
  },
  {
    id: 't3',
    name: 'Amit Singh',
    phone: '+91 98765 55678',
    email: 'amit.singh.hvac@gmail.com',
    role: 'technician',
    preferred_language: 'en-IN',
    default_street_address: 'Sector 121, Noida',
    default_unit_floor: null,
    default_location: null,
    created_at: '2025-11-05T11:00:00Z',
    updated_at: '2026-08-28T16:00:00Z',
  },
];

export const dbTechnicianProfiles: TechnicianProfileRow[] = [
  {
    id: 't1',
    rating: 4.9,
    total_jobs: 1284,
    review_count: 856,
    experience_years: 6,
    vehicle_type: 'Honda Activa',
    vehicle_registration: 'DL 5S 4521',
    is_online: true,
    photo_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop&auto=format',
    identity_verified: true,
    skill_verified: true,
    background_checked: true,
    created_at: '2025-06-15T08:30:00Z',
    updated_at: '2026-09-05T14:40:00Z',
  },
  {
    id: 't2',
    rating: 4.7,
    total_jobs: 892,
    review_count: 420,
    experience_years: 4,
    vehicle_type: 'TVS Jupiter',
    vehicle_registration: 'UP 16 BT 7823',
    is_online: true,
    photo_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&h=120&fit=crop&auto=format',
    identity_verified: true,
    skill_verified: true,
    background_checked: true,
    created_at: '2025-08-20T10:30:00Z',
    updated_at: '2026-09-01T12:00:00Z',
  },
  {
    id: 't3',
    rating: 4.8,
    total_jobs: 567,
    review_count: 310,
    experience_years: 3,
    vehicle_type: 'Bajaj Pulsar',
    vehicle_registration: 'DL 7C 9012',
    is_online: false,
    photo_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&fit=crop&auto=format',
    identity_verified: true,
    skill_verified: true,
    background_checked: false,
    created_at: '2025-11-05T11:30:00Z',
    updated_at: '2026-08-28T16:00:00Z',
  },
];

export const dbServiceCategories: ServiceCategoryRow[] = [
  {
    id: 'electrical',
    slug: 'electrical',
    name: 'Electrical',
    icon: '⚡',
    description: 'Power failure, wiring, short circuit',
    sos_base_price: 499,
    sos_emergency_fee: 149,
    supports_sos: true,
    supports_scheduled: true,
    liability_tier: 'tier_2',
    default_duration_minutes: 45,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'plumbing',
    slug: 'plumbing',
    name: 'Plumbing',
    icon: '💧',
    description: 'Leakage, blocked drains, burst pipes',
    sos_base_price: 449,
    sos_emergency_fee: 149,
    supports_sos: true,
    supports_scheduled: true,
    liability_tier: 'tier_1',
    default_duration_minutes: 45,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'ac',
    slug: 'ac',
    name: 'AC Repair',
    icon: '❄️',
    description: 'No cooling, gas refill, service',
    sos_base_price: 599,
    sos_emergency_fee: 199,
    supports_sos: true,
    supports_scheduled: true,
    liability_tier: 'tier_2',
    default_duration_minutes: 60,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'appliance',
    slug: 'appliance',
    name: 'Appliance',
    icon: '🔧',
    description: 'Washing machine, fridge, microwave',
    sos_base_price: 399,
    sos_emergency_fee: 99,
    supports_sos: true,
    supports_scheduled: true,
    liability_tier: 'tier_1',
    default_duration_minutes: 45,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'locksmith',
    slug: 'locksmith',
    name: 'Locksmith',
    icon: '🔐',
    description: 'Locked out, broken lock, key copy',
    sos_base_price: 349,
    sos_emergency_fee: 149,
    supports_sos: true,
    supports_scheduled: false,
    liability_tier: 'tier_1',
    default_duration_minutes: 30,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'carpenter',
    slug: 'carpenter',
    name: 'Carpenter',
    icon: '🪚',
    description: 'Door, furniture, window repair',
    sos_base_price: 399,
    sos_emergency_fee: 99,
    supports_sos: true,
    supports_scheduled: true,
    liability_tier: 'tier_1',
    default_duration_minutes: 60,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'water-leakage',
    slug: 'water-leakage',
    name: 'Water Leakage',
    icon: '🚰',
    description: 'Roof, walls, bathroom seepage',
    sos_base_price: 549,
    sos_emergency_fee: 199,
    supports_sos: true,
    supports_scheduled: false,
    liability_tier: 'tier_2',
    default_duration_minutes: 60,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'other',
    slug: 'other',
    name: 'Other Emergency',
    icon: '🔥',
    description: 'Gas, chimney, other urgent issues',
    sos_base_price: 499,
    sos_emergency_fee: 149,
    supports_sos: true,
    supports_scheduled: false,
    liability_tier: 'tier_3',
    default_duration_minutes: 45,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'cleaning',
    slug: 'cleaning',
    name: 'Cleaning',
    icon: '🧹',
    description: 'Full home deep clean and sanitization',
    sos_base_price: null,
    sos_emergency_fee: null,
    supports_sos: false,
    supports_scheduled: true,
    liability_tier: 'tier_1',
    default_duration_minutes: 180,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'pest',
    slug: 'pest',
    name: 'Pest Control',
    icon: '🐜',
    description: 'Termite, cockroach, and bug management',
    sos_base_price: null,
    sos_emergency_fee: null,
    supports_sos: false,
    supports_scheduled: true,
    liability_tier: 'tier_2',
    default_duration_minutes: 120,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'painting',
    slug: 'painting',
    name: 'Painting',
    icon: '🖌️',
    description: 'Full house, room, and touchup painting',
    sos_base_price: null,
    sos_emergency_fee: null,
    supports_sos: false,
    supports_scheduled: true,
    liability_tier: 'tier_1',
    default_duration_minutes: 240,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
];

export const dbServiceOfferings: ServiceOfferingRow[] = [
  // AC offerings
  {
    id: 'off_ac_1',
    category_id: 'ac',
    name: 'AC Service & Cleaning',
    price: 499,
    description: 'Full service, filter clean, drain check',
    duration_min_minutes: 60,
    duration_max_minutes: 120,
    sort_order: 1,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'off_ac_2',
    category_id: 'ac',
    name: 'AC Gas Refill (R22)',
    price: 999,
    description: 'Gas top-up with pressure test',
    duration_min_minutes: 120,
    duration_max_minutes: 180,
    sort_order: 2,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'off_ac_3',
    category_id: 'ac',
    name: 'AC Installation',
    price: 1299,
    description: 'New AC installation with testing',
    duration_min_minutes: 180,
    duration_max_minutes: 240,
    sort_order: 3,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },

  // Electrical offerings
  {
    id: 'off_el_1',
    category_id: 'electrical',
    name: 'Fan Installation',
    price: 249,
    description: 'Ceiling or wall fan fitting',
    duration_min_minutes: 30,
    duration_max_minutes: 45,
    sort_order: 1,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'off_el_2',
    category_id: 'electrical',
    name: 'Switchboard Repair',
    price: 349,
    description: 'Wiring, switch, and socket repair',
    duration_min_minutes: 60,
    duration_max_minutes: 120,
    sort_order: 2,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'off_el_3',
    category_id: 'electrical',
    name: 'Full Home Wiring Check',
    price: 799,
    description: 'Safety audit of all circuits',
    duration_min_minutes: 180,
    duration_max_minutes: 240,
    sort_order: 3,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },

  // Plumbing offerings
  {
    id: 'off_pl_1',
    category_id: 'plumbing',
    name: 'Tap/Faucet Repair',
    price: 249,
    description: 'Fix or replace leaking taps',
    duration_min_minutes: 30,
    duration_max_minutes: 60,
    sort_order: 1,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'off_pl_2',
    category_id: 'plumbing',
    name: 'Drain Cleaning',
    price: 399,
    description: 'Kitchen and bathroom drain clearing',
    duration_min_minutes: 60,
    duration_max_minutes: 120,
    sort_order: 2,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'off_pl_3',
    category_id: 'plumbing',
    name: 'Water Heater Service',
    price: 599,
    description: 'Geyser repair and descaling',
    duration_min_minutes: 90,
    duration_max_minutes: 120,
    sort_order: 3,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },

  // Cleaning offerings
  {
    id: 'off_cl_1',
    category_id: 'cleaning',
    name: 'Home Deep Clean (2BHK)',
    price: 1199,
    description: 'Full home deep clean including bathrooms',
    duration_min_minutes: 240,
    duration_max_minutes: 300,
    sort_order: 1,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'off_cl_2',
    category_id: 'cleaning',
    name: 'Kitchen Deep Clean',
    price: 699,
    description: 'Chimney, hob, and appliance clean',
    duration_min_minutes: 120,
    duration_max_minutes: 180,
    sort_order: 2,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'off_cl_3',
    category_id: 'cleaning',
    name: 'Bathroom Cleaning (2)',
    price: 499,
    description: 'Tiles, commode, and fixtures',
    duration_min_minutes: 120,
    duration_max_minutes: 180,
    sort_order: 3,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },

  // Fallback/Standard offerings
  {
    id: 'off_def_1',
    category_id: 'default',
    name: 'Standard Service',
    price: 399,
    description: 'General service and maintenance',
    duration_min_minutes: 60,
    duration_max_minutes: 120,
    sort_order: 1,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'off_def_2',
    category_id: 'default',
    name: 'Premium Service',
    price: 699,
    description: 'Comprehensive service with warranty',
    duration_min_minutes: 120,
    duration_max_minutes: 180,
    sort_order: 2,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
];

export const dbRequests: RequestRow[] = [
  {
    id: 'b1',
    client_id: 'u_client_1',
    user_id: 'u_client_1',
    technician_id: 't1',
    category_id: 'electrical',
    offering_id: null,
    cancellation_reason: null,
    status: 'completed',
    priority: 'high',
    contact_name: 'Abdullah Khan',
    contact_phone: '+91 99876 54321',
    address_line: 'B-204, Gaur City 2',
    area: 'Greater Noida West',
    address_text: null,
    address_notes: null,
    saved_address_id: 'a1',
    family_member_id: null,
    service_location: null,
    search_radius_km: 10,
    radius_expanded_at: null,
    estimated_total: 648,
    final_price: 998,
    surge_multiplier_applied: 1.0,
    description: 'Burnt smell and spark from main distribution board',
    symptoms: ['Power outage in entire flat', 'Sparks near main MCB'],
    estimated_duration_minutes: 72,
    execution_window: null,
    price_adjustment_reason: 'additional_parts',
    price_adjustment_notes: 'Replaced 2x 16A MCB units burnt due to overload',
    superseded_from_request_id: null,
    technician_location_at_dispatch: null,
    accepted_at: '2026-09-05T14:40:00Z',
    completed_at: '2026-09-05T15:54:00Z',
    scheduled_at: null,
    created_at: '2026-09-05T14:38:00Z',
    updated_at: '2026-09-05T15:55:00Z',
  },
  {
    id: 'b2',
    client_id: 'u_client_1',
    user_id: 'u_client_1',
    technician_id: 't3',
    category_id: 'ac',
    offering_id: 'off_ac_2',
    cancellation_reason: null,
    status: 'completed',
    priority: 'medium',
    contact_name: 'Abdullah Khan',
    contact_phone: '+91 99876 54321',
    address_line: 'B-204, Gaur City 2',
    area: 'Greater Noida West',
    address_text: null,
    address_notes: null,
    saved_address_id: 'a1',
    family_member_id: null,
    service_location: null,
    search_radius_km: 15,
    radius_expanded_at: null,
    estimated_total: 1299,
    final_price: 1299,
    surge_multiplier_applied: 1.0,
    description: 'Master bedroom split AC not cooling',
    symptoms: ['Warm air blowing', 'Low refrigerant'],
    estimated_duration_minutes: 120,
    execution_window: null,
    price_adjustment_reason: null,
    price_adjustment_notes: null,
    superseded_from_request_id: null,
    technician_location_at_dispatch: null,
    accepted_at: '2026-08-27T18:00:00Z',
    completed_at: '2026-08-28T12:30:00Z',
    scheduled_at: '2026-08-28T10:00:00Z',
    created_at: '2026-08-27T17:30:00Z',
    updated_at: '2026-08-28T12:35:00Z',
  },
  {
    id: 'b3',
    client_id: 'u_client_1',
    user_id: 'u_client_1',
    technician_id: 't2',
    category_id: 'plumbing',
    offering_id: 'off_pl_2',
    cancellation_reason: null,
    status: 'completed',
    priority: 'high',
    contact_name: 'Abdullah Khan',
    contact_phone: '+91 99876 54321',
    address_line: 'B-204, Gaur City 2',
    area: 'Greater Noida West',
    address_text: null,
    address_notes: null,
    saved_address_id: 'a1',
    family_member_id: null,
    service_location: null,
    search_radius_km: 10,
    radius_expanded_at: null,
    estimated_total: 649,
    final_price: 649,
    surge_multiplier_applied: 1.0,
    description: 'Kitchen sink drain blocked and overflowing',
    symptoms: ['Water backing up', 'Foul odor'],
    estimated_duration_minutes: 60,
    execution_window: null,
    price_adjustment_reason: null,
    price_adjustment_notes: null,
    superseded_from_request_id: null,
    technician_location_at_dispatch: null,
    accepted_at: '2026-08-12T11:05:00Z',
    completed_at: '2026-08-12T12:15:00Z',
    scheduled_at: null,
    created_at: '2026-08-12T11:02:00Z',
    updated_at: '2026-08-12T12:20:00Z',
  },
  {
    id: 'b4',
    client_id: 'u_client_1',
    user_id: 'u_client_1',
    technician_id: null,
    category_id: 'cleaning',
    offering_id: 'off_cl_1',
    cancellation_reason: null,
    status: 'completed',
    priority: 'medium',
    contact_name: 'Abdullah Khan',
    contact_phone: '+91 99876 54321',
    address_line: 'B-204, Gaur City 2',
    area: 'Greater Noida West',
    address_text: null,
    address_notes: null,
    saved_address_id: 'a1',
    family_member_id: null,
    service_location: null,
    search_radius_km: 15,
    radius_expanded_at: null,
    estimated_total: 1199,
    final_price: 1199,
    surge_multiplier_applied: 1.0,
    description: 'Pre-festival full house deep cleaning',
    symptoms: [],
    estimated_duration_minutes: 240,
    execution_window: null,
    price_adjustment_reason: null,
    price_adjustment_notes: null,
    superseded_from_request_id: null,
    technician_location_at_dispatch: null,
    accepted_at: '2026-07-29T16:00:00Z',
    completed_at: '2026-07-30T15:00:00Z',
    scheduled_at: '2026-07-30T10:00:00Z',
    created_at: '2026-07-29T15:30:00Z',
    updated_at: '2026-07-30T15:10:00Z',
  },
  {
    id: 'b5',
    client_id: 'u_client_1',
    user_id: 'u_client_1',
    technician_id: null,
    category_id: 'pest',
    offering_id: null,
    cancellation_reason: null,
    status: 'cancelled',
    priority: 'medium',
    contact_name: 'Abdullah Khan',
    contact_phone: '+91 99876 54321',
    address_line: 'B-204, Gaur City 2',
    area: 'Greater Noida West',
    address_text: null,
    address_notes: null,
    saved_address_id: 'a1',
    family_member_id: null,
    service_location: null,
    search_radius_km: 15,
    radius_expanded_at: null,
    estimated_total: 899,
    final_price: null,
    surge_multiplier_applied: 1.0,
    description: 'Kitchen cockroach control service',
    symptoms: [],
    estimated_duration_minutes: 90,
    execution_window: null,
    price_adjustment_reason: null,
    price_adjustment_notes: null,
    superseded_from_request_id: null,
    technician_location_at_dispatch: null,
    accepted_at: null,
    completed_at: null,
    scheduled_at: '2026-07-18T14:00:00Z',
    created_at: '2026-07-17T18:00:00Z',
    updated_at: '2026-07-18T10:00:00Z',
  },
];

export const dbFamilyMembers: FamilyMemberRow[] = [
  {
    id: 'f1',
    owner_id: 'u_client_1',
    name: 'Papa',
    relation: 'Father',
    emoji: '👨',
    phone: '+91 98110 45678',
    address_line: 'A-47, Sector 62, Noida',
    area: 'Noida, Uttar Pradesh',
    location: null,
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-01-15T10:00:00Z',
  },
  {
    id: 'f2',
    owner_id: 'u_client_1',
    name: 'Mummy',
    relation: 'Mother',
    emoji: '👩',
    phone: '+91 98110 45679',
    address_line: 'A-47, Sector 62, Noida',
    area: 'Noida, Uttar Pradesh',
    location: null,
    created_at: '2026-01-15T10:05:00Z',
    updated_at: '2026-01-15T10:05:00Z',
  },
  {
    id: 'f3',
    owner_id: 'u_client_1',
    name: 'Dadi',
    relation: 'Grandmother',
    emoji: '👵',
    phone: '+91 97110 23456',
    address_line: 'H.No. 12, Lal Kuan, Delhi',
    area: 'Old Delhi, Delhi',
    location: null,
    created_at: '2026-02-01T14:00:00Z',
    updated_at: '2026-02-01T14:00:00Z',
  },
];

export const dbSavedAddresses: SavedAddressRow[] = [
  {
    id: 'a1',
    user_id: 'u_client_1',
    label: 'Home',
    icon: '🏠',
    address_line: 'B-204, Gaur City 2, Greater Noida West',
    address_line1: 'B-204, Gaur City 2',
    address_line2: '14th Avenue',
    landmark: 'Near City Plaza roundabout',
    city: 'Greater Noida West',
    postal_code: '201318',
    latitude: 28.6083,
    longitude: 77.4267,
    area: 'Greater Noida, UP 201318',
    is_default: true,
    location: null,
    created_at: '2026-01-10T09:35:00Z',
    updated_at: '2026-01-10T09:35:00Z',
  },
  {
    id: 'a2',
    user_id: 'u_client_1',
    label: 'Work',
    icon: '🏢',
    address_line: '14th Floor, Tower C, World Trade Centre',
    address_line1: '14th Floor, Tower C',
    address_line2: 'World Trade Centre',
    landmark: 'Opposite Metro Station',
    city: 'Noida',
    postal_code: '201301',
    latitude: 28.5700,
    longitude: 77.3200,
    area: 'Sector 16, Noida, UP 201301',
    is_default: false,
    location: null,
    created_at: '2026-01-12T11:00:00Z',
    updated_at: '2026-01-12T11:00:00Z',
  },
  {
    id: 'a3',
    user_id: 'u_client_1',
    label: "Papa's Home",
    icon: '🏡',
    address_line: 'A-47, Sector 62',
    address_line1: 'A-47',
    address_line2: 'Sector 62',
    landmark: 'Near Fortis Hospital',
    city: 'Noida',
    postal_code: '201309',
    latitude: 28.6280,
    longitude: 77.3649,
    area: 'Noida, Uttar Pradesh 201309',
    is_default: false,
    location: null,
    created_at: '2026-01-15T10:10:00Z',
    updated_at: '2026-01-15T10:10:00Z',
  },
];

export const dbInvoices: InvoiceRow[] = [
  {
    id: 'inv_1',
    request_id: 'b1',
    invoice_number: '#INV-2026-09-2094',
    subtotal: 998,
    tax: 0,
    total: 998,
    commission_rate_applied: 0.15,
    issued_at: '2026-09-05T15:55:00Z',
  },
];

export const dbCostAdditions: CostAdditionRow[] = [
  {
    id: 'ca_1',
    request_id: 'b1',
    amount: 350,
    reason:
      'The main switchboard has a faulty MCB (Miniature Circuit Breaker) that needs replacement. This part was not visible during initial diagnosis and must be replaced to safely restore power.',
    tags: ['MCB Replacement', 'Safety Issue', 'Electrical Hazard'],
    status: 'approved',
    created_at: '2026-09-05T15:10:00Z',
    resolved_at: '2026-09-05T15:15:00Z',
  },
];

export const dbPayments: PaymentRow[] = [
  {
    id: 'pay_1',
    request_id: 'b1',
    amount: 998,
    method: 'upi',
    status: 'succeeded',
    upi_id: 'abdullah@okhdfcbank',
    provider_reference: 'UPI/20260905/982184912',
    paid_at: '2026-09-05T16:01:00Z',
    created_at: '2026-09-05T15:58:00Z',
  },
];

export const dbReviews: ReviewRow[] = [
  {
    id: 'rev_1',
    request_id: 'b1',
    client_id: 'u_client_1',
    technician_id: 't1',
    rating: 5,
    review_text: 'Rahul arrived in 8 minutes and fixed our short circuit safely. Very professional!',
    tags: ['Professional', 'Fast', 'Skilled', 'Clean work'],
    tip_amount: 50,
    created_at: '2026-09-05T16:10:00Z',
  },
];

// ---------------------------------------------------------------------------
// 2. Pure Typed Mappers (DB Row -> Domain View Model)
// ---------------------------------------------------------------------------

const categoryColors: Record<string, string> = {
  electrical: 'amber',
  plumbing: 'blue',
  ac: 'cyan',
  appliance: 'purple',
  locksmith: 'orange',
  carpenter: 'yellow',
  'water-leakage': 'teal',
  other: 'red',
  cleaning: 'emerald',
  pest: 'stone',
  painting: 'indigo',
};

export function mapDbCategoryToServiceCategory(cat: ServiceCategoryRow): ServiceCategory {
  return {
    id: cat.id,
    icon: cat.icon,
    name: cat.name,
    description: cat.description ?? '',
    basePrice: cat.sos_base_price ?? 0,
    emergencyFee: cat.sos_emergency_fee ?? 0,
    color: categoryColors[cat.id] ?? 'red',
  };
}

export function mapDbCategoryToScheduledCategory(
  cat: ServiceCategoryRow,
  minPrice: number = 299,
): ScheduledCategory {
  return {
    id: cat.id,
    icon: cat.icon,
    name:
      cat.id === 'electrical'
        ? 'Electrician'
        : cat.id === 'plumbing'
        ? 'Plumber'
        : cat.id === 'ac'
        ? 'AC Service'
        : cat.id === 'appliance'
        ? 'Appliance Repair'
        : cat.name,
    price: minPrice,
  };
}

export function mapDbOfferingToDomain(off: ServiceOfferingRow): ServiceOffering {
  const minH = off.duration_min_minutes ? off.duration_min_minutes / 60 : 1;
  const maxH = off.duration_max_minutes ? off.duration_max_minutes / 60 : 2;
  const duration =
    off.duration_min_minutes && off.duration_max_minutes && off.duration_max_minutes < 60
      ? `${off.duration_min_minutes}–${off.duration_max_minutes} min`
      : `${minH}–${maxH} hrs`;

  return {
    name: off.name,
    price: off.price,
    duration,
    desc: off.description ?? '',
  };
}

export function mapDbTechnicianToDomain(
  user: UserRow,
  profile: TechnicianProfileRow,
  categoryName: string = 'Electrician',
  overrides?: Partial<Technician>,
): Technician {
  return {
    id: user.id,
    name: user.name,
    photo: profile.photo_url ?? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop&auto=format',
    rating: profile.rating,
    jobs: profile.total_jobs,
    distance: overrides?.distance ?? '1.8 km',
    eta: overrides?.eta ?? '8 min',
    vehicle:
      profile.vehicle_type && profile.vehicle_registration
        ? `${profile.vehicle_type} · ${profile.vehicle_registration}`
        : 'Honda Activa · DL 5S 4521',
    category: categoryName,
    phone: user.phone ?? '+91 98765 43210',
    verified: profile.identity_verified && profile.skill_verified,
    identityVerified: profile.identity_verified,
    skillVerified: profile.skill_verified,
    backgroundChecked: profile.background_checked,
    experience: profile.experience_years ? `${profile.experience_years} years` : '5 years',
    ...overrides,
  };
}

export function mapDbRequestToBookingRecord(
  req: RequestRow,
  cat?: ServiceCategoryRow,
  techUser?: UserRow,
  ratingOverride?: number,
): BookingRecord {
  const isSos = req.scheduled_at === null;
  const formattedDate = new Date(req.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const formattedStatus =
    req.status === 'completed'
      ? 'Completed'
      : req.status === 'cancelled'
      ? 'Cancelled'
      : req.status === 'declined'
      ? 'Declined'
      : 'In Progress';

  return {
    id: req.id,
    service: cat ? (isSos ? `${cat.name} Repair` : cat.name) : 'Home Service',
    icon: cat?.icon ?? '🔧',
    technician: techUser ? techUser.name : 'Service Partner',
    date: formattedDate,
    status: formattedStatus,
    amount: req.final_price
      ? `₹${req.final_price.toLocaleString('en-IN')}`
      : req.estimated_total
      ? `₹${req.estimated_total.toLocaleString('en-IN')}`
      : '—',
    type: isSos ? 'sos' : 'scheduled',
    rating: ratingOverride ?? (req.status === 'completed' ? 5 : 0),
  };
}

export function mapDbFamilyMemberToDomain(fm: FamilyMemberRow, color: string = 'blue'): FamilyMember {
  return {
    id: fm.id,
    name: fm.name,
    relation: fm.relation,
    emoji: fm.emoji ?? '👤',
    address: fm.address_line,
    area: fm.area,
    phone: fm.phone ?? '',
    color,
  };
}

export function mapDbSavedAddressToDomain(sa: SavedAddressRow): SavedAddress {
  return {
    id: sa.id,
    label: sa.label,
    icon: sa.icon ?? '📍',
    address: sa.address_line,
    area: sa.area,
  };
}

// ---------------------------------------------------------------------------
// 3. Pre-mapped Datasets (Matches domain fixtures 100% for backwards compatibility)
// ---------------------------------------------------------------------------

export const mappedServiceCategories: ServiceCategory[] = dbServiceCategories
  .filter((c) => c.supports_sos)
  .map(mapDbCategoryToServiceCategory);

const scheduledPrices: Record<string, number> = {
  cleaning: 299,
  electrical: 349,
  plumbing: 299,
  ac: 499,
  carpenter: 349,
  appliance: 399,
  pest: 899,
  painting: 1499,
};

export const mappedScheduledCategories: ScheduledCategory[] = dbServiceCategories
  .filter((c) => c.supports_scheduled)
  .map((c) => mapDbCategoryToScheduledCategory(c, scheduledPrices[c.id] ?? 299));

export const mappedScheduledOfferings: Record<string, ServiceOffering[]> = {
  ac: dbServiceOfferings.filter((o) => o.category_id === 'ac').map(mapDbOfferingToDomain),
  electrical: dbServiceOfferings.filter((o) => o.category_id === 'electrical').map(mapDbOfferingToDomain),
  plumbing: dbServiceOfferings.filter((o) => o.category_id === 'plumbing').map(mapDbOfferingToDomain),
  cleaning: dbServiceOfferings.filter((o) => o.category_id === 'cleaning').map(mapDbOfferingToDomain),
  default: dbServiceOfferings.filter((o) => o.category_id === 'default').map(mapDbOfferingToDomain),
};

export const mappedTechnicians: Technician[] = [
  mapDbTechnicianToDomain(dbUsers[1], dbTechnicianProfiles[0], 'Electrician', {
    distance: '1.8 km',
    eta: '8 min',
    vehicle: 'Honda Activa · DL 5S 4521',
  }),
  mapDbTechnicianToDomain(dbUsers[2], dbTechnicianProfiles[1], 'Plumber', {
    distance: '2.4 km',
    eta: '12 min',
    vehicle: 'TVS Jupiter · UP 16 BT 7823',
  }),
  mapDbTechnicianToDomain(dbUsers[3], dbTechnicianProfiles[2], 'AC Technician', {
    distance: '3.1 km',
    eta: '15 min',
    vehicle: 'Bajaj Pulsar · DL 7C 9012',
    backgroundChecked: false,
  }),
];

export const mappedBookingHistory: BookingRecord[] = [
  {
    id: 'b1',
    service: 'Electrical Repair',
    icon: '⚡',
    technician: 'Rahul Kumar',
    date: 'Sep 5, 2026',
    status: 'Completed',
    amount: '₹998',
    type: 'sos',
    rating: 5,
  },
  {
    id: 'b2',
    service: 'AC Service & Gas Refill',
    icon: '❄️',
    technician: 'Amit Singh',
    date: 'Aug 28, 2026',
    status: 'Completed',
    amount: '₹1,299',
    type: 'scheduled',
    rating: 4,
  },
  {
    id: 'b3',
    service: 'Plumbing — Drain Cleaning',
    icon: '💧',
    technician: 'Suresh Yadav',
    date: 'Aug 12, 2026',
    status: 'Completed',
    amount: '₹649',
    type: 'sos',
    rating: 5,
  },
  {
    id: 'b4',
    service: 'Home Deep Cleaning',
    icon: '🧹',
    technician: 'Cleaning Partners',
    date: 'Jul 30, 2026',
    status: 'Completed',
    amount: '₹1,199',
    type: 'scheduled',
    rating: 4,
  },
  {
    id: 'b5',
    service: 'Pest Control',
    icon: '🐜',
    technician: 'EradiCare Services',
    date: 'Jul 18, 2026',
    status: 'Cancelled',
    amount: '—',
    type: 'scheduled',
    rating: 0,
  },
];

export const mappedFamilyMembers: FamilyMember[] = [
  mapDbFamilyMemberToDomain(dbFamilyMembers[0], 'blue'),
  mapDbFamilyMemberToDomain(dbFamilyMembers[1], 'pink'),
  mapDbFamilyMemberToDomain(dbFamilyMembers[2], 'purple'),
];

export const mappedSavedAddresses: SavedAddress[] = dbSavedAddresses.map(mapDbSavedAddressToDomain);

export const mappedInvoiceLineItems: InvoiceLineItem[] = [
  { desc: 'Electrical repair service (1 hr 12 min)', amount: 499 },
  { desc: 'Emergency dispatch fee', amount: 149 },
  { desc: 'MCB replacement (×2) — parts', amount: 240 },
  { desc: 'MCB replacement — labour', amount: 110 },
];

export const mappedInvoiceSummary = {
  invoiceNumber: dbInvoices[0].invoice_number,
  date: 'Sep 5, 2026',
  jobId: '#SH-2094',
  timeRange: '2:42 PM – 3:54 PM',
  billedToName: dbUsers[0].name,
  billedToAddressLine1: dbRequests[0].address_line,
  billedToAddressLine2: dbRequests[0].area,
  subtotal: dbInvoices[0].subtotal,
  gstLabel: 'GST (0%)',
  gstAmount: 0,
  total: dbInvoices[0].total,
  paidVia: 'Paid via UPI · Sep 5, 2026 · 4:01 PM',
  supportLine: 'support@soshomefix.in · 1800-SOS-HOME',
};

export const mappedAdditionalWorkRequest: AdditionalWorkRequest = {
  reason: dbCostAdditions[0].reason,
  tags: dbCostAdditions[0].tags,
  originalEstimate: dbRequests[0].estimated_total,
  addedLabel: 'MCB replacement (×2)',
  addedSublabel: 'Parts + installation',
  addedAmount: dbCostAdditions[0].amount,
  newTotal: dbRequests[0].final_price ?? dbRequests[0].estimated_total,
};

export const mappedTechnicianJobHistory: TechnicianJobRecord[] = [
  { id: 'b1', service: 'Electrical Repair', customer: 'Azaan Sheikh', date: 'Sep 5, 2026', amount: '₹998', status: 'Completed' },
  { id: 'b2', service: 'AC Service & Gas Refill', customer: 'Priya Mehta', date: 'Aug 28, 2026', amount: '₹1,299', status: 'Completed' },
  { id: 'b3', service: 'Drain Cleaning', customer: 'Rohan Gupta', date: 'Aug 12, 2026', amount: '₹0', status: 'Declined' },
];
