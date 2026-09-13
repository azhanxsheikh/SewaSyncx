import type {
  DiagnosticQuestion,
  PriorityLevel,
  ScheduledCategory,
  ServiceCategory,
  ServiceOffering,
} from '../types/domain';
import {
  mappedScheduledCategories,
  mappedScheduledOfferings,
  mappedServiceCategories,
} from '../mocks/fixtures';

/** Emergency (SOS) catalogue. Maps to `service_categories` where `supports_sos`. Derived from canonical DB fixtures. */
export const serviceCategories: ServiceCategory[] = mappedServiceCategories;

/** Scheduled-booking catalogue. Maps to `service_categories` where `supports_scheduled`. Derived from canonical DB fixtures. */
export const scheduledCategories: ScheduledCategory[] = mappedScheduledCategories;

/** Priced offerings per scheduled category. Maps to `service_offerings`. Derived from canonical DB fixtures. */
export const scheduledOfferings: Record<string, ServiceOffering[]> = mappedScheduledOfferings;

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
