import type { Technician, TechnicianJobRecord } from '../types/domain';

/** Maps to `users` joined with `technician_profiles`. */
export const technicians: Technician[] = [
  {
    id: 't1',
    name: 'Rahul Kumar',
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop&auto=format',
    rating: 4.9,
    jobs: 1284,
    distance: '1.8 km',
    eta: '8 min',
    vehicle: 'Honda Activa · DL 5S 4521',
    category: 'Electrician',
    phone: '+91 98765 43210',
    verified: true,
    identityVerified: true,
    skillVerified: true,
    backgroundChecked: true,
    experience: '6 years',
  },
  {
    id: 't2',
    name: 'Suresh Yadav',
    photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&h=120&fit=crop&auto=format',
    rating: 4.7,
    jobs: 892,
    distance: '2.4 km',
    eta: '12 min',
    vehicle: 'TVS Jupiter · UP 16 BT 7823',
    category: 'Plumber',
    phone: '+91 98765 11234',
    verified: true,
    identityVerified: true,
    skillVerified: true,
    backgroundChecked: true,
    experience: '4 years',
  },
  {
    id: 't3',
    name: 'Amit Singh',
    photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&fit=crop&auto=format',
    rating: 4.8,
    jobs: 567,
    distance: '3.1 km',
    eta: '15 min',
    vehicle: 'Bajaj Pulsar · DL 7C 9012',
    category: 'AC Technician',
    phone: '+91 98765 55678',
    verified: true,
    identityVerified: true,
    skillVerified: true,
    backgroundChecked: false,
    experience: '3 years',
  },
];

/**
 * Technician-side completed work. Maps to `requests` filtered by `technician_id`.
 *
 * Note: these customer names intentionally differ from the client-side
 * `bookingHistory` fixture — in the prototype the two lists are unrelated mock
 * data, not two views of the same rows. The Supabase integration collapses both
 * into a single `requests` query.
 */
export const technicianJobHistory: TechnicianJobRecord[] = [
  { id: 'b1', service: 'Electrical Repair', customer: 'Azaan Sheikh', date: 'Sep 5, 2026', amount: '₹998', status: 'Completed' },
  { id: 'b2', service: 'AC Service & Gas Refill', customer: 'Priya Mehta', date: 'Aug 28, 2026', amount: '₹1,299', status: 'Completed' },
  { id: 'b3', service: 'Drain Cleaning', customer: 'Rohan Gupta', date: 'Aug 12, 2026', amount: '₹0', status: 'Declined' },
];

/** Filter tabs on the technician job-history screen. */
export const technicianHistoryFilters: string[] = ['All', 'Completed', 'Cancelled', 'Declined'];
