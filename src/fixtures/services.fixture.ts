import type {
  DiagnosticQuestion,
  PriorityLevel,
  ScheduledCategory,
  ServiceCategory,
  ServiceOffering,
} from '../types/domain';

/** Emergency (SOS) catalogue. Maps to `service_categories` where `supports_sos`. */
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

/** Scheduled-booking catalogue. Maps to `service_categories` where `supports_scheduled`. */
export const scheduledCategories: ScheduledCategory[] = [
  { id: 'cleaning', icon: '🧹', name: 'Cleaning', price: 299 },
  { id: 'electrical', icon: '⚡', name: 'Electrician', price: 349 },
  { id: 'plumbing', icon: '💧', name: 'Plumber', price: 299 },
  { id: 'ac', icon: '❄️', name: 'AC Service', price: 499 },
  { id: 'carpenter', icon: '🪚', name: 'Carpenter', price: 349 },
  { id: 'appliance', icon: '🔧', name: 'Appliance Repair', price: 399 },
  { id: 'pest', icon: '🐜', name: 'Pest Control', price: 899 },
  { id: 'painting', icon: '🖌️', name: 'Painting', price: 1499 },
];

/** Priced offerings per scheduled category. Maps to `service_offerings`. */
export const scheduledOfferings: Record<string, ServiceOffering[]> = {
  ac: [
    { name: 'AC Service & Cleaning', price: 499, duration: '1–2 hrs', desc: 'Full service, filter clean, drain check' },
    { name: 'AC Gas Refill (R22)', price: 999, duration: '2–3 hrs', desc: 'Gas top-up with pressure test' },
    { name: 'AC Installation', price: 1299, duration: '3–4 hrs', desc: 'New AC installation with testing' },
  ],
  electrical: [
    { name: 'Fan Installation', price: 249, duration: '30–45 min', desc: 'Ceiling or wall fan fitting' },
    { name: 'Switchboard Repair', price: 349, duration: '1–2 hrs', desc: 'Wiring, switch, and socket repair' },
    { name: 'Full Home Wiring Check', price: 799, duration: '3–4 hrs', desc: 'Safety audit of all circuits' },
  ],
  plumbing: [
    { name: 'Tap/Faucet Repair', price: 249, duration: '30–60 min', desc: 'Fix or replace leaking taps' },
    { name: 'Drain Cleaning', price: 399, duration: '1–2 hrs', desc: 'Kitchen and bathroom drain clearing' },
    { name: 'Water Heater Service', price: 599, duration: '1.5–2 hrs', desc: 'Geyser repair and descaling' },
  ],
  cleaning: [
    { name: 'Home Deep Clean (2BHK)', price: 1199, duration: '4–5 hrs', desc: 'Full home deep clean including bathrooms' },
    { name: 'Kitchen Deep Clean', price: 699, duration: '2–3 hrs', desc: 'Chimney, hob, and appliance clean' },
    { name: 'Bathroom Cleaning (2)', price: 499, duration: '2–3 hrs', desc: 'Tiles, commode, and fixtures' },
  ],
  default: [
    { name: 'Standard Service', price: 399, duration: '1–2 hrs', desc: 'General service and maintenance' },
    { name: 'Premium Service', price: 699, duration: '2–3 hrs', desc: 'Comprehensive service with warranty' },
  ],
};

/** Bookable slots. A real implementation derives these from technician availability. */
export const timeSlots: string[] = ['9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'];

export const availableDates: { label: string; date: string }[] = [
  { label: 'Tomorrow', date: 'Sep 6, Sat' },
  { label: 'Sun', date: 'Sep 7' },
  { label: 'Mon', date: 'Sep 8' },
  { label: 'Tue', date: 'Sep 9' },
  { label: 'Wed', date: 'Sep 10' },
];

/** Triage levels. Maps to the `request_priority` enum plus presentation copy. */
export const priorityLevels: PriorityLevel[] = [
  {
    id: 'high',
    label: 'HIGH',
    emoji: '🔴',
    title: 'Immediate assistance required',
    description: 'Active water leakage, electrical hazard, locked out, no access to home, or another issue requiring immediate help.',
    eta: 'ETA: 15–30 min',
    bg: 'bg-red-50',
    border: 'border-red-300',
    labelBg: 'bg-red-500',
    labelText: 'text-white',
    etaColor: 'text-red-600',
  },
  {
    id: 'medium',
    label: 'MEDIUM',
    emoji: '🟡',
    title: 'Needs attention soon',
    description: 'AC not cooling, slow drain, door not latching properly, or a problem that is inconvenient but not dangerous.',
    eta: 'ETA: 30–60 min',
    bg: 'bg-amber-50',
    border: 'border-amber-300',
    labelBg: 'bg-amber-500',
    labelText: 'text-white',
    etaColor: 'text-amber-600',
  },
  {
    id: 'low',
    label: 'LOW',
    emoji: '🟢',
    title: 'Can wait a little while',
    description: 'Minor repair, cosmetic issue, or something that is not causing immediate disruption or risk.',
    eta: 'ETA: 1–2 hrs',
    bg: 'bg-emerald-50',
    border: 'border-emerald-300',
    labelBg: 'bg-emerald-500',
    labelText: 'text-white',
    etaColor: 'text-emerald-600',
  },
];

/** Multi-select symptom tags. Maps to `requests.symptoms`. */
export const symptomTags: string[] = [
  'Water leaking', 'No electricity', 'Strange noise', 'Smoke / burning smell',
  'AC not cooling', "Door won't open", 'Sparks / short circuit', 'Gas smell', 'Other',
];

/** Per-category diagnostic triage. Answers map to `request_answers`. */
export const diagnosticQuestions: Record<string, DiagnosticQuestion[]> = {
  electrical: [
    { q: 'What is affected?', opts: ['Entire home', 'One room', 'One appliance', 'Not sure'] },
    { q: 'Is there smoke, sparks, or burning smell?', opts: ['Yes', 'No', 'Not sure'] },
    { q: 'When did this start?', opts: ['Just now', 'A few hours ago', 'Yesterday', 'A few days ago'] },
  ],
  plumbing: [
    { q: 'What is the issue?', opts: ['Burst pipe', 'Blocked drain', 'Leaking tap', 'No water supply', 'Other'] },
    { q: 'Is water damaging the property?', opts: ['Yes, actively', 'Some dampness', 'No, contained'] },
  ],
  ac: [
    { q: 'What is the problem?', opts: ['No cooling', 'No power', 'Unusual noise', 'Water dripping', 'Remote not working'] },
    { q: 'How old is the AC?', opts: ['Less than 2 years', '2–5 years', '5–10 years', 'More than 10 years'] },
  ],
  default: [
    { q: "What best describes the issue?", opts: ["Completely stopped working", "Working poorly", "Making strange sounds", "Visible damage"] },
    { q: 'Is there any immediate safety risk?', opts: ['Yes', 'No', 'Not sure'] },
  ],
};
