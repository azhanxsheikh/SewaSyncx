import type { Database } from '../types/database';

export type DisputePriority = 'critical' | 'high' | 'medium' | 'low';

export interface DisputeTimelineEvent {
  id: string;
  timestamp: string;
  lane: 'lifecycle' | 'telemetry' | 'conversation' | 'evidence' | 'context';
  title: string;
  description: string;
  badge?: string;
  badgeColor?: 'emerald' | 'amber' | 'red' | 'blue' | 'slate';
  meta?: Record<string, string | number | boolean>;
}

export interface AdminDisputeRecord {
  id: string;
  requestId: string;
  priority: DisputePriority;
  reasonCategory: Database['public']['Enums']['dispute_reason'];
  status: Database['public']['Enums']['dispute_status'];
  clientName: string;
  clientPhone: string;
  technicianName: string;
  technicianPhone: string;
  serviceCategory: string;
  escrowAmount: number;
  finalPrice: number;
  estimatedPrice: number;
  description: string;
  createdAt: string;
  prePhotoUrl?: string;
  postPhotoUrl?: string;
  events: DisputeTimelineEvent[];
}

export interface TechnicianComplianceItem {
  id: string;
  name: string;
  phone: string;
  category: string;
  aadhaarMasked: string;
  aadhaarStatus: 'verified' | 'pending' | 'rejected';
  policeCheckStatus: 'verified' | 'pending' | 'expired';
  policeCheckExpiry: string;
  toolAttestationStatus: 'certified' | 'pending' | 'expired';
  toolCertifiedCount: number;
  toolRequiredCount: number;
  activeMinutes: number;
  streakMinutes: number;
  heatAdjustedCapMinutes: number;
  isThrottled: boolean;
  throttleReason?: string;
  rating: number;
  totalJobs: number;
}

export interface FareVarianceCategorySummary {
  category: string;
  jobCount: number;
  avgEstimatedPrice: number;
  avgFinalPrice: number;
  avgVariancePercent: number;
  highVarianceCount: number;
}

export interface CollusionAnomalyRecord {
  id: string;
  clientId: string;
  clientName: string;
  technicianId: string;
  technicianName: string;
  observedMatches: number;
  expectedMatches: number;
  poissonLlr: number;
  zScore: number;
  sharedDeviceOrIp: boolean;
  rapidReviewCluster: boolean;
  status: 'open' | 'cleared' | 'confirmed';
  flaggedDate: string;
}

export interface PhotoMismatchReviewItem {
  id: string;
  requestId: string;
  technicianName: string;
  clientName: string;
  serviceCategory: string;
  prePhotoUrl: string;
  postPhotoUrl: string;
  exifGpsDeltaMeters: number;
  timestampAnomaly: boolean;
  phashDistance: number;
  status: 'pending_review' | 'approved' | 'dispute_opened';
}

export const mockAdminDisputes: AdminDisputeRecord[] = [
  {
    id: 'disp-8901',
    requestId: 'req-4029',
    priority: 'critical',
    reasonCategory: 'safety_concern',
    status: 'open',
    clientName: 'Sunita Rao',
    clientPhone: '+91 98112 34567',
    technicianName: 'Manoj Sharma',
    technicianPhone: '+91 98765 43210',
    serviceCategory: 'Electrical',
    escrowAmount: 1850,
    finalPrice: 1850,
    estimatedPrice: 648,
    description: 'Technician demanded immediate cash on site and bypassed main circuit breaker without safety test.',
    createdAt: '12 mins ago',
    prePhotoUrl: 'https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?w=400&fit=crop&auto=format',
    postPhotoUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=400&fit=crop&auto=format',
    events: [
      {
        id: 'ev-1',
        timestamp: '14:02',
        lane: 'lifecycle',
        title: 'SOS Request Dispatched',
        description: 'Customer requested high priority electrical surge inspection.',
        badge: 'Requested',
        badgeColor: 'blue',
      },
      {
        id: 'ev-2',
        timestamp: '14:07',
        lane: 'telemetry',
        title: 'Technician En Route GPS Ping',
        description: 'Position verified 1.8 km away moving along Sector 12 highway.',
        badge: 'GPS Confirmed',
        badgeColor: 'emerald',
      },
      {
        id: 'ev-3',
        timestamp: '14:14',
        lane: 'context',
        title: 'Gated Society Entry Delay',
        description: 'MyGate entry clearance logged. Security gate hold: +9 min delay.',
        badge: 'Society Gate Delay',
        badgeColor: 'amber',
      },
      {
        id: 'ev-4',
        timestamp: '14:26',
        lane: 'evidence',
        title: 'Pre-work Photo Uploaded',
        description: 'Burned distribution board photo uploaded (EXIF delta: 24m from address).',
        badge: 'EXIF Valid',
        badgeColor: 'emerald',
      },
      {
        id: 'ev-5',
        timestamp: '14:48',
        lane: 'conversation',
        title: 'Client Dispute Raised',
        description: 'Customer filed dispute: Demanded off-platform cash surge + bypass safety concern.',
        badge: 'Disputed',
        badgeColor: 'red',
      },
    ],
  },
  {
    id: 'disp-8902',
    requestId: 'req-3891',
    priority: 'high',
    reasonCategory: 'price_dispute',
    status: 'under_review',
    clientName: 'Vikas Malhotra',
    clientPhone: '+91 97123 45678',
    technicianName: 'Rahul Kumar',
    technicianPhone: '+91 98765 00000',
    serviceCategory: 'Plumbing',
    escrowAmount: 1450,
    finalPrice: 1450,
    estimatedPrice: 449,
    description: 'Billed ₹1,001 extra for CPVC pipe coupling without showing old replaced parts.',
    createdAt: '45 mins ago',
    prePhotoUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400&fit=crop&auto=format',
    postPhotoUrl: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=400&fit=crop&auto=format',
    events: [
      {
        id: 'ev-21',
        timestamp: '11:15',
        lane: 'lifecycle',
        title: 'Job Accepted & Started',
        description: 'Plumbing burst pipe emergency.',
        badge: 'In Progress',
        badgeColor: 'blue',
      },
      {
        id: 'ev-22',
        timestamp: '11:32',
        lane: 'evidence',
        title: 'Cost Addition Logged',
        description: 'Technician logged on-site replacement of 3-meter CPVC pipe and union valve.',
        badge: 'Cost Addition',
        badgeColor: 'amber',
      },
      {
        id: 'ev-23',
        timestamp: '12:05',
        lane: 'lifecycle',
        title: 'Service Completed & Escrow Held',
        description: 'Job closed out at ₹1,450. Escrow held pending invoice reconciliation.',
        badge: 'Escrow Held',
        badgeColor: 'blue',
      },
    ],
  },
  {
    id: 'disp-8903',
    requestId: 'req-3120',
    priority: 'medium',
    reasonCategory: 'no_show',
    status: 'open',
    clientName: 'Pooja Verma',
    clientPhone: '+91 99887 66554',
    technicianName: 'Vikram Singh',
    technicianPhone: '+91 91234 56789',
    serviceCategory: 'AC Repair',
    escrowAmount: 799,
    finalPrice: 799,
    estimatedPrice: 799,
    description: 'Technician marked arrived but never reached 5th floor flat. Ghosting alert triggered.',
    createdAt: '2 hrs ago',
    events: [
      {
        id: 'ev-31',
        timestamp: '09:30',
        lane: 'lifecycle',
        title: 'Technician Accepted',
        description: 'Dispatched from Indirapuram hub.',
        badge: 'Accepted',
        badgeColor: 'blue',
      },
      {
        id: 'ev-32',
        timestamp: '09:48',
        lane: 'telemetry',
        title: 'Heartbeat Timeout / Telemetry Stalled',
        description: 'GPS coordinates stationary at main road intersection for 16 minutes.',
        badge: 'Ghosting Alert',
        badgeColor: 'red',
      },
    ],
  },
];

export const mockComplianceRegistry: TechnicianComplianceItem[] = [
  {
    id: 'tech-01',
    name: 'Rahul Kumar',
    phone: '+91 98765 00000',
    category: 'Electrical',
    aadhaarMasked: '•••• •••• 8921',
    aadhaarStatus: 'verified',
    policeCheckStatus: 'verified',
    policeCheckExpiry: '2027-04-15',
    toolAttestationStatus: 'certified',
    toolCertifiedCount: 5,
    toolRequiredCount: 5,
    activeMinutes: 340,
    streakMinutes: 110,
    heatAdjustedCapMinutes: 420,
    isThrottled: false,
    rating: 4.9,
    totalJobs: 248,
  },
  {
    id: 'tech-02',
    name: 'Manoj Sharma',
    phone: '+91 98765 43210',
    category: 'Electrical',
    aadhaarMasked: '•••• •••• 4512',
    aadhaarStatus: 'verified',
    policeCheckStatus: 'pending',
    policeCheckExpiry: '2026-09-01 (Expired)',
    toolAttestationStatus: 'certified',
    toolCertifiedCount: 4,
    toolRequiredCount: 5,
    activeMinutes: 445,
    streakMinutes: 195,
    heatAdjustedCapMinutes: 420,
    isThrottled: true,
    throttleReason: 'Fatigue cap exceeded (445m / 420m heat cap)',
    rating: 4.2,
    totalJobs: 132,
  },
  {
    id: 'tech-03',
    name: 'Amit Patel',
    phone: '+91 98223 34455',
    category: 'Plumbing',
    aadhaarMasked: '•••• •••• 6734',
    aadhaarStatus: 'verified',
    policeCheckStatus: 'verified',
    policeCheckExpiry: '2027-01-20',
    toolAttestationStatus: 'expired',
    toolCertifiedCount: 2,
    toolRequiredCount: 4,
    activeMinutes: 180,
    streakMinutes: 60,
    heatAdjustedCapMinutes: 480,
    isThrottled: true,
    throttleReason: 'Mandatory pipe threader attestation expired',
    rating: 4.7,
    totalJobs: 195,
  },
  {
    id: 'tech-04',
    name: 'Deepak Yadav',
    phone: '+91 99112 23344',
    category: 'Appliances',
    aadhaarMasked: '•••• •••• 1198',
    aadhaarStatus: 'verified',
    policeCheckStatus: 'verified',
    policeCheckExpiry: '2026-12-10',
    toolAttestationStatus: 'certified',
    toolCertifiedCount: 4,
    toolRequiredCount: 4,
    activeMinutes: 210,
    streakMinutes: 80,
    heatAdjustedCapMinutes: 480,
    isThrottled: false,
    rating: 4.8,
    totalJobs: 312,
  },
];

export const mockFareVarianceSummaries: FareVarianceCategorySummary[] = [
  {
    category: 'Electrical',
    jobCount: 142,
    avgEstimatedPrice: 610,
    avgFinalPrice: 785,
    avgVariancePercent: 28.7,
    highVarianceCount: 14,
  },
  {
    category: 'Plumbing',
    jobCount: 98,
    avgEstimatedPrice: 480,
    avgFinalPrice: 620,
    avgVariancePercent: 29.2,
    highVarianceCount: 9,
  },
  {
    category: 'Appliances',
    jobCount: 76,
    avgEstimatedPrice: 850,
    avgFinalPrice: 990,
    avgVariancePercent: 16.5,
    highVarianceCount: 3,
  },
];

export const mockCollusionAnomalies: CollusionAnomalyRecord[] = [
  {
    id: 'col-01',
    clientId: 'cli-551',
    clientName: 'Sanjay Deshmukh',
    technicianId: 'tech-02',
    technicianName: 'Manoj Sharma',
    observedMatches: 11,
    expectedMatches: 1.4,
    poissonLlr: 14.8,
    zScore: 4.2,
    sharedDeviceOrIp: true,
    rapidReviewCluster: true,
    status: 'open',
    flaggedDate: 'Today, 10:15 AM',
  },
  {
    id: 'col-02',
    clientId: 'cli-882',
    clientName: 'Kavita Chawla',
    technicianId: 'tech-03',
    technicianName: 'Amit Patel',
    observedMatches: 8,
    expectedMatches: 1.8,
    poissonLlr: 9.4,
    zScore: 3.4,
    sharedDeviceOrIp: false,
    rapidReviewCluster: true,
    status: 'open',
    flaggedDate: 'Yesterday, 4:20 PM',
  },
];

export const mockPhotoMismatchReviews: PhotoMismatchReviewItem[] = [
  {
    id: 'pm-101',
    requestId: 'req-4029',
    technicianName: 'Manoj Sharma',
    clientName: 'Sunita Rao',
    serviceCategory: 'Electrical',
    prePhotoUrl: 'https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?w=300&fit=crop&auto=format',
    postPhotoUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=300&fit=crop&auto=format',
    exifGpsDeltaMeters: 480,
    timestampAnomaly: true,
    phashDistance: 18,
    status: 'pending_review',
  },
  {
    id: 'pm-102',
    requestId: 'req-3912',
    technicianName: 'Ramesh Verma',
    clientName: 'Kunal Kapoor',
    serviceCategory: 'Plumbing',
    prePhotoUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=300&fit=crop&auto=format',
    postPhotoUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=300&fit=crop&auto=format',
    exifGpsDeltaMeters: 22,
    timestampAnomaly: false,
    phashDistance: 0,
    status: 'pending_review',
  },
];
