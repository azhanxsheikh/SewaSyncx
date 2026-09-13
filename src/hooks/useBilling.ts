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
import { getBaseServicePrice, getSosFeeForPriority } from '../lib/pricing';

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
  const sosFee = getSosFeeForPriority(priority);
  const baseServicePrice = getBaseServicePrice();
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
    // Mirrors the database enum public.price_adjustment_reason.
    const reasonLabels: Record<string, string> = {
      additional_parts: 'On-site parts replacement',
      additional_labor_time: 'Additional labor time',
      access_difficulty: 'Access difficulty surcharge',
      misdiagnosis_correction: 'Misdiagnosis correction',
      customer_requested_scope_change: 'Customer-requested scope change',
      other: 'Other adjustment',
    };
    const reasonKey = job.priceAdjustmentReason ?? 'additional_parts';
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
