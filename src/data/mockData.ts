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
  | 'notifications';

export interface ServiceCategory {
  id: string;
  icon: string;
  name: string;
  description: string;
  basePrice: number;
  emergencyFee: number;
  color: string;
}

export const serviceCategories: ServiceCategory[] = [
  { id: 'electrical', icon: '⚡', name: 'Electrical', description: 'Power failure, wiring, short circuit', basePrice: 499, emergencyFee: 149, color: 'amber' },
  { id: 'plumbing', icon: '💧', name: 'Plumbing', description: 'Leakage, blocked drains, burst pipes', basePrice: 449, emergencyFee: 149, color: 'blue' },
  { id: 'ac', icon: '❄️', name: 'AC Repair', description: 'No cooling, gas refill, service', basePrice: 599, emergencyFee: 199, color: 'cyan' },
  { id: 'appliance', icon: '🔧', name: 'Appliance', description: 'Washing machine, fridge, microwave', basePrice: 399, emergencyFee: 99, color: 'purple' },
  { id: 'locksmith', icon: '🔐', name: 'Locksmith', description: 'Locked out, broken lock, key copy', basePrice: 349, emergencyFee: 149, color: 'orange' },
  { id: 'carpenter', icon: '🪚', name: 'Carpenter', description: 'Door, furniture, window repair', basePrice: 399, emergencyFee: 99, color: 'yellow' },
  { id: 'water-leakage', icon: '🚰', name: 'Water Leakage', description: 'Roof, walls, bathroom seepage', basePrice: 549, emergencyFee: 199, color: 'teal' },
  { id: 'other', icon: '🔥', name: 'Other Emergency', description: 'Gas, chimney, other urgent issues', basePrice: 499, emergencyFee: 149, color: 'red' },
];

export const scheduledCategories = [
  { id: 'cleaning', icon: '🧹', name: 'Cleaning', price: 299 },
  { id: 'electrical', icon: '⚡', name: 'Electrician', price: 349 },
  { id: 'plumbing', icon: '💧', name: 'Plumber', price: 299 },
  { id: 'ac', icon: '❄️', name: 'AC Service', price: 499 },
  { id: 'carpenter', icon: '🪚', name: 'Carpenter', price: 349 },
  { id: 'appliance', icon: '🔧', name: 'Appliance Repair', price: 399 },
  { id: 'pest', icon: '🐜', name: 'Pest Control', price: 899 },
  { id: 'painting', icon: '🖌️', name: 'Painting', price: 1499 },
];

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

export interface FamilyMember {
  id: string;
  name: string;
  relation: string;
  emoji: string;
  address: string;
  area: string;
  phone: string;
  color: string;
}

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

export const savedAddresses = [
  { id: 'a1', label: 'Home', icon: '🏠', address: 'B-204, Gaur City 2, Greater Noida West', area: 'Greater Noida, UP 201318' },
  { id: 'a2', label: 'Work', icon: '🏢', address: '14th Floor, Tower C, World Trade Centre', area: 'Sector 16, Noida, UP 201301' },
  { id: 'a3', label: "Papa's Home", icon: '🏡', address: 'A-47, Sector 62', area: 'Noida, Uttar Pradesh 201309' },
];

export const bookingHistory = [
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

export const notifications = [
  { id: 'n1', title: 'Rahul has accepted your request.', time: '2 min ago', read: false, icon: '✅' },
  { id: 'n2', title: 'Rahul is 5 minutes away.', time: '10 min ago', read: false, icon: '📍' },
  { id: 'n3', title: 'Your technician has arrived.', time: '18 min ago', read: true, icon: '🚪' },
  { id: 'n4', title: 'Additional work requires your approval — ₹350 extra.', time: '35 min ago', read: true, icon: '⚠️' },
  { id: 'n5', title: 'Your invoice is ready. Total: ₹998.', time: '1 hr ago', read: true, icon: '🧾' },
  { id: 'n6', title: 'Your AC Service is confirmed for Aug 28 at 10:00 AM.', time: '2 days ago', read: true, icon: '📅' },
];

export const chatMessages = [
  { id: 'm1', sender: 'system', text: 'You are now connected with Rahul Kumar.', time: '2:31 PM' },
  { id: 'm2', sender: 'user', text: "Hi Rahul, I'm at the address. The main switchboard tripped and I can't reset it.", time: '2:32 PM' },
  { id: 'm3', sender: 'tech', text: "Hello! I'm on my way. Arriving in about 8 minutes. Please don't try to touch the switchboard.", time: '2:33 PM' },
  { id: 'm4', sender: 'user', text: "Okay, I'll wait outside.", time: '2:34 PM' },
  { id: 'm5', sender: 'tech', text: 'Perfect. See you shortly!', time: '2:35 PM' },
];

export const quickReplies = [
  'Where are you?',
  "I'm waiting outside.",
  'Please call me.',
  'The gate is open.',
  'Come to flat no. 204.',
];
