import {
  additionalWorkRequest,
  invoiceLineItems,
  invoiceSummary,
  paymentMethods,
  ratingLabels,
  reviewTags,
  tipOptions,
  upiApps,
} from '../fixtures/billing.fixture';
import type {
  AdditionalWorkRequest,
  InvoiceLineItem,
  PaymentMethodOption,
} from '../types/domain';
import type { DispatchJob } from '../types/dispatch';

/**
 * Returns available payment methods.
 */
export function usePaymentMethods(): PaymentMethodOption[] {
  return paymentMethods;
}

/**
 * Returns popular UPI app shortcuts.
 */
export function useUpiApps(): string[] {
  return upiApps;
}

/**
 * Returns invoice breakdown and summary metadata.
 * If a dispatch job is passed, dynamically calculates transparent line items:
 * - Base Service Charge
 * - Emergency SOS Fee (Low: ₹49, Medium: ₹149, High: ₹249)
 * - On-site Cost Additions with reason and notes
 * - Total Settled Amount
 */
export function useInvoiceDetails(job?: DispatchJob | null): {
  lineItems: InvoiceLineItem[];
  summary: typeof invoiceSummary;
} {
  if (!job) {
    return {
      lineItems: invoiceLineItems,
      summary: invoiceSummary,
    };
  }

  const priority = (job.priority ?? 'medium').toLowerCase();
  const sosFee = priority === 'high' ? 249 : priority === 'low' ? 49 : 149;
  const baseServicePrice = 499;
  const settledTotal = job.finalPrice ?? job.estimatedTotal ?? (baseServicePrice + sosFee);
  const serviceName = job.service
    ? job.service
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
    : 'Electrical Repair';

  const items: InvoiceLineItem[] = [
    {
      desc: `${serviceName} — Base service charge`,
      amount: baseServicePrice,
    },
    {
      desc: `Emergency SOS fee (${priority.charAt(0).toUpperCase() + priority.slice(1)} priority dispatch)`,
      amount: sosFee,
    },
  ];

  const variance = settledTotal - (baseServicePrice + sosFee);
  if (variance !== 0) {
    const reasonLabels: Record<string, string> = {
      standard_quote: 'Standard quote adjustment',
      additional_parts_replaced: 'On-site parts replacement',
      unforeseen_complexity: 'Unforeseen complexity surcharge',
      extended_labor_hours: 'Extended labor hours',
      emergency_surcharge: 'Emergency on-site surcharge',
    };
    const reasonKey = job.priceAdjustmentReason ?? 'additional_parts_replaced';
    const reasonLabel = reasonLabels[reasonKey] ?? reasonKey.replace(/_/g, ' ');
    const desc = job.priceAdjustmentNotes
      ? `${reasonLabel} (${job.priceAdjustmentNotes})`
      : reasonLabel;

    items.push({
      desc,
      amount: variance,
    });
  }

  const summary = {
    ...invoiceSummary,
    jobId: `#${job.id}`,
    billedToName: job.customerName || invoiceSummary.billedToName,
    billedToAddressLine1: job.location || invoiceSummary.billedToAddressLine1,
    subtotal: settledTotal,
    total: settledTotal,
  };

  return {
    lineItems: items,
    summary,
  };
}

/**
 * Returns pending or active additional work approval request.
 */
export function useAdditionalWork(): AdditionalWorkRequest {
  return additionalWorkRequest;
}

/**
 * Returns review options including rating descriptors, review tags, and tip presets.
 */
export function useReviewOptions(): {
  ratingLabels: Record<number, string>;
  reviewTags: string[];
  tipOptions: string[];
} {
  return {
    ratingLabels,
    reviewTags,
    tipOptions,
  };
}
