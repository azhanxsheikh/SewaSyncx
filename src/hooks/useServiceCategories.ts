import { useMemo } from 'react';
import { scheduledCategories, serviceCategories } from '../fixtures/services.fixture';
import type { ScheduledCategory, ServiceCategory } from '../types/domain';

/**
 * Returns the list of emergency (SOS) service categories.
 *
 * Preserves synchronous contract: returns the list immediately to satisfy the
 * zero-white-screen invariant.
 */
export function useServiceCategories(): ServiceCategory[] {
  return serviceCategories;
}

/**
 * Resolves a specific emergency service category by id, with safe fallback to
 * the first category (electrical) if not found.
 */
export function useServiceCategory(categoryId: string): ServiceCategory {
  return useMemo(
    () => serviceCategories.find((category) => category.id === categoryId) || serviceCategories[0],
    [categoryId],
  );
}

/**
 * Returns the list of categories available for scheduled bookings.
 */
export function useScheduledCategories(): ScheduledCategory[] {
  return scheduledCategories;
}
