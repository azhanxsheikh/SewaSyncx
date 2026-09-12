import type {
  ClientStats,
  FamilyMember,
  MenuItem,
  NotificationRecord,
  SavedAddress,
} from '../types/domain';

/** Signed-in client identity. Maps to `users`. */
export const clientProfile = {
  name: 'Abdullah Khan',
  greetingName: 'Abdullah',
  initial: 'A',
  phone: '+91 99876 54321',
  email: 'abdullah.khan@gmail.com',
  areaLabel: 'Gaur City 2, Greater Noida West',
};

/** Profile header counters. Derived server-side in the target architecture. */
export const clientStats: ClientStats = {
  servicesUsed: 12,
  sosUsed: 3,
  averageRating: 4.8,
};

/** Maps to `saved_addresses`. */
export const savedAddresses: SavedAddress[] = [
  { id: 'a1', label: 'Home', icon: '🏠', address: 'B-204, Gaur City 2, Greater Noida West', area: 'Greater Noida, UP 201318' },
  { id: 'a2', label: 'Work', icon: '🏢', address: '14th Floor, Tower C, World Trade Centre', area: 'Sector 16, Noida, UP 201301' },
  { id: 'a3', label: "Papa's Home", icon: '🏡', address: 'A-47, Sector 62', area: 'Noida, Uttar Pradesh 201309' },
];

/**
 * Address options shown in the scheduled-booking flow.
 *
 * These strings intentionally differ from `savedAddresses` above — the
 * prototype hard-coded a separate shorter list on that screen. Preserved
 * verbatim so the rendered output is unchanged.
 */
export const scheduledAddressOptions: { label: string; icon: string; addr: string; area: string }[] = [
  { label: 'Home', icon: '🏠', addr: 'B-204, Gaur City 2, Greater Noida West', area: 'Greater Noida, UP 201318' },
  { label: 'Work', icon: '🏢', addr: '14th Floor, World Trade Centre, Sector 16', area: 'Noida, UP 201301' },
];

/** Default service location seeded into the dispatch context. */
export const defaultConfirmedLocation = {
  id: 'a1',
  label: 'Home',
  fullAddress: 'B-204, Gaur City 2, Greater Noida West',
  area: 'Greater Noida, UP 201318',
};

/** Maps to `family_members`. */
export const familyMembers: FamilyMember[] = [
  {
    id: 'f1',
    name: 'Papa',
    relation: 'Father',
    emoji: '👨',
    address: 'A-47, Sector 62, Noida',
    area: 'Noida, Uttar Pradesh',
    phone: '+91 98110 45678',
    color: 'blue',
  },
  {
    id: 'f2',
    name: 'Mummy',
    relation: 'Mother',
    emoji: '👩',
    address: 'A-47, Sector 62, Noida',
    area: 'Noida, Uttar Pradesh',
    phone: '+91 98110 45679',
    color: 'pink',
  },
  {
    id: 'f3',
    name: 'Dadi',
    relation: 'Grandmother',
    emoji: '👵',
    address: 'H.No. 12, Lal Kuan, Delhi',
    area: 'Old Delhi, Delhi',
    phone: '+91 97110 23456',
    color: 'purple',
  },
];

/** Maps to `notifications`. */
export const notifications: NotificationRecord[] = [
  { id: 'n1', title: 'Rahul has accepted your request.', time: '2 min ago', read: false, icon: '✅' },
  { id: 'n2', title: 'Rahul is 5 minutes away.', time: '10 min ago', read: false, icon: '📍' },
  { id: 'n3', title: 'Your technician has arrived.', time: '18 min ago', read: true, icon: '🚪' },
  { id: 'n4', title: 'Additional work requires your approval — ₹350 extra.', time: '35 min ago', read: true, icon: '⚠️' },
  { id: 'n5', title: 'Your invoice is ready. Total: ₹998.', time: '1 hr ago', read: true, icon: '🧾' },
  { id: 'n6', title: 'Your AC Service is confirmed for Aug 28 at 10:00 AM.', time: '2 days ago', read: true, icon: '📅' },
];

/** Account settings rows on the profile screen. */
export const accountMenuItems: MenuItem[] = [
  { icon: '🔔', label: 'Notifications', desc: 'Push & SMS alerts' },
  { icon: '🔒', label: 'Privacy & Security', desc: 'Data & location settings' },
  { icon: '💳', label: 'Payment Methods', desc: 'UPI, cards, net banking' },
  { icon: '👥', label: 'Family Members', desc: '3 members saved' },
];

/** Help & support rows on the profile screen. */
export const supportMenuItems: MenuItem[] = [
  { icon: '💬', label: 'Contact Support', desc: '24/7 assistance' },
  { icon: '⭐', label: 'Rate the App', desc: 'Share your feedback' },
  { icon: '📜', label: 'Terms & Privacy', desc: 'Legal documents' },
];
