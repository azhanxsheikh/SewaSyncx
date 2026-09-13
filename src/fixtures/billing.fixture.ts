import type {
  AdditionalWorkRequest,
  InvoiceLineItem,
  PaymentMethodOption,
} from '../types/domain';
import {
  mappedAdditionalWorkRequest,
  mappedInvoiceLineItems,
  mappedInvoiceSummary,
} from '../mocks/fixtures';

/** Maps to the `payment_method` enum. */
export const paymentMethods: PaymentMethodOption[] = [
  { id: 'upi', label: 'UPI', icon: '📱', desc: 'Google Pay, PhonePe, Paytm, etc.' },
  { id: 'card', label: 'Credit / Debit Card', icon: '💳', desc: 'Visa, Mastercard, RuPay' },
  { id: 'netbanking', label: 'Net Banking', icon: '🏦', desc: 'All major Indian banks' },
  { id: 'cash', label: 'Cash', icon: '💵', desc: 'Pay the technician directly' },
];

/** UPI app shortcuts rendered under the UPI ID field. */
export const upiApps: string[] = ['GPay', 'PhonePe', 'Paytm', 'BHIM'];

/** Maps to `invoice_line_items`. Derived from canonical DB fixtures. */
export const invoiceLineItems: InvoiceLineItem[] = mappedInvoiceLineItems;

/** Invoice header metadata rendered on the digital invoice. Derived from canonical DB fixtures. */
export const invoiceSummary = mappedInvoiceSummary;

/** Maps to `request_cost_additions` — the approval-gated variance record. Derived from canonical DB fixtures. */
export const additionalWorkRequest: AdditionalWorkRequest = mappedAdditionalWorkRequest;

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
