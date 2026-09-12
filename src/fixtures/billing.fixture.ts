import type {
  AdditionalWorkRequest,
  InvoiceLineItem,
  PaymentMethodOption,
} from '../types/domain';

/** Maps to the `payment_method` enum. */
export const paymentMethods: PaymentMethodOption[] = [
  { id: 'upi', label: 'UPI', icon: '📱', desc: 'Google Pay, PhonePe, Paytm, etc.' },
  { id: 'card', label: 'Credit / Debit Card', icon: '💳', desc: 'Visa, Mastercard, RuPay' },
  { id: 'netbanking', label: 'Net Banking', icon: '🏦', desc: 'All major Indian banks' },
  { id: 'cash', label: 'Cash', icon: '💵', desc: 'Pay the technician directly' },
];

/** UPI app shortcuts rendered under the UPI ID field. */
export const upiApps: string[] = ['GPay', 'PhonePe', 'Paytm', 'BHIM'];

/** Maps to `invoice_line_items`. */
export const invoiceLineItems: InvoiceLineItem[] = [
  { desc: 'Electrical repair service (1 hr 12 min)', amount: 499 },
  { desc: 'Emergency dispatch fee', amount: 149 },
  { desc: 'MCB replacement (×2) — parts', amount: 240 },
  { desc: 'MCB replacement — labour', amount: 110 },
];

/** Invoice header metadata rendered on the digital invoice. */
export const invoiceSummary = {
  invoiceNumber: '#INV-2026-09-2094',
  date: 'Sep 5, 2026',
  jobId: '#SH-2094',
  timeRange: '2:42 PM – 3:54 PM',
  billedToName: 'Abdullah Khan',
  billedToAddressLine1: 'B-204, Gaur City 2',
  billedToAddressLine2: 'Greater Noida West',
  subtotal: 998,
  gstLabel: 'GST (0%)',
  gstAmount: 0,
  total: 998,
  paidVia: 'Paid via UPI · Sep 5, 2026 · 4:01 PM',
  supportLine: 'support@soshomefix.in · 1800-SOS-HOME',
};

/** Maps to `request_cost_additions` — the approval-gated variance record. */
export const additionalWorkRequest: AdditionalWorkRequest = {
  reason:
    'The main switchboard has a faulty MCB (Miniature Circuit Breaker) that needs replacement. This part was not visible during initial diagnosis and must be replaced to safely restore power.',
  tags: ['MCB Replacement', 'Safety Issue', 'Electrical Hazard'],
  originalEstimate: 648,
  addedLabel: 'MCB replacement (×2)',
  addedSublabel: 'Parts + installation',
  addedAmount: 350,
  newTotal: 998,
};

/** Post-service review attribute tags. Maps to `reviews.tags`. */
export const reviewTags: string[] = [
  'Professional', 'Fast', 'Polite', 'Skilled', 'Transparent pricing', 'Clean work', 'On time', 'Well equipped',
];

/** Gratuity presets. Maps to `reviews.tip_amount`. */
export const tipOptions: string[] = ['₹20', '₹50', '₹100', 'Custom'];

/** Star-rating descriptors. */
export const ratingLabels: Record<number, string> = {
  1: 'Poor', 2: 'Below average', 3: 'Good', 4: 'Very good', 5: 'Excellent!',
};
