import type {
  ChatMessage,
  HowItWorksStep,
  PlatformFeature,
  ServiceShortcut,
} from '../types/domain';

/** Maps to `chat_messages`; `sender` maps to the `chat_sender_role` enum. */
export const chatMessages: ChatMessage[] = [
  { id: 'm1', sender: 'system', text: 'You are now connected with Rahul Kumar.', time: '2:31 PM' },
  { id: 'm2', sender: 'user', text: "Hi Rahul, I'm at the address. The main switchboard tripped and I can't reset it.", time: '2:32 PM' },
  { id: 'm3', sender: 'tech', text: "Hello! I'm on my way. Arriving in about 8 minutes. Please don't try to touch the switchboard.", time: '2:33 PM' },
  { id: 'm4', sender: 'user', text: "Okay, I'll wait outside.", time: '2:34 PM' },
  { id: 'm5', sender: 'tech', text: 'Perfect. See you shortly!', time: '2:35 PM' },
];

/** Canned client replies. Presentation-only; never persisted. */
export const quickReplies: string[] = [
  'Where are you?',
  "I'm waiting outside.",
  'Please call me.',
  'The gate is open.',
  'Come to flat no. 204.',
];

/** Scheduled-service shortcuts on the home screen. */
export const homeScheduledShortcuts: ServiceShortcut[] = [
  { icon: '🧹', name: 'Cleaning', id: 'cleaning' },
  { icon: '⚡', name: 'Electrician', id: 'electrical' },
  { icon: '💧', name: 'Plumber', id: 'plumbing' },
  { icon: '🖌️', name: 'Painting', id: 'painting' },
];

/** Value-proposition grid on the home screen. */
export const platformFeatures: PlatformFeature[] = [
  { icon: '✅', text: 'Verified Professionals' },
  { icon: '⚡', text: 'Fast Emergency Dispatch' },
  { icon: '💰', text: 'Transparent Pricing' },
  { icon: '📍', text: 'Live Tech Tracking' },
  { icon: '🔒', text: 'Secure Payments' },
  { icon: '📞', text: '24/7 Support' },
];

/** Explainer steps on the home screen. */
export const howItWorksSteps: HowItWorksStep[] = [
  { n: '1', t: 'Request help', d: 'Tap SOS and describe your problem' },
  { n: '2', t: 'We match a technician', d: 'Nearest verified professional dispatched' },
  { n: '3', t: 'Track their arrival', d: 'Live map tracking with ETA updates' },
  { n: '4', t: 'Problem solved', d: 'Pay after service, get digital invoice' },
];
