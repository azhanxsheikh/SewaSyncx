/**
 * Shared client-side pricing estimate, used wherever a job's estimated
 * total is needed before a real quote exists (job creation in
 * DispatchContext, and the fallback invoice breakdown in useBilling).
 *
 * This is a placeholder, not the source of truth: there is no per-category
 * pricing table yet, so every service category gets the same flat base
 * price plus a priority-tiered emergency fee. Once request creation reads
 * back a real `requests.estimated_total` from Supabase (see
 * docs/DEPLOYMENT roadmap — auth phase), this estimate should only be
 * shown before that row exists, never after.
 */

const BASE_SERVICE_PRICE = 499;

const SOS_FEE_BY_PRIORITY: Record<string, number> = {
  low: 49,
  medium: 149,
  high: 249,
};

export function getBaseServicePrice(): number {
  return BASE_SERVICE_PRICE;
}

export function getSosFeeForPriority(priority?: string): number {
  const key = (priority ?? 'medium').toLowerCase();
  return SOS_FEE_BY_PRIORITY[key] ?? SOS_FEE_BY_PRIORITY.medium;
}

/**
 * `service` (the category slug) is accepted for forward compatibility with
 * per-category pricing, but is not yet used — every category is priced the
 * same today.
 */
export function estimateJobTotal(_service: string, priority?: string): number {
  return getBaseServicePrice() + getSosFeeForPriority(priority);
}
