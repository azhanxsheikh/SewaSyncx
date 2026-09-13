import { useMemo } from 'react';
import { scheduledCategories as fixtureScheduledCategories, serviceCategories as fixtureServiceCategories } from '../fixtures/services.fixture';
import { useData } from '../context/DataProvider';
import type { ScheduledCategory, ServiceCategory } from '../types/domain';

/**
 * Returns the list of emergency (SOS) service categories.
 *
 * Real query (service_categories has an open SELECT policy for anyone
 * signed in — see 20260913000002_security_linter_fixes.sql). Falls back to
 * the fixture list before the initial DataProvider fetch resolves or if the
 * signed-out preview render needs something to show, preserving the
 * zero-white-screen contract.
 */
export function useServiceCategories(): ServiceCategory[] {
  const { ready, serviceCategories } = useData();
  return ready && serviceCategories.length ? serviceCategories : fixtureServiceCategories;
}

/**
 * Resolves a specific emergency service category by id, with safe fallback to
 * the first category (electrical) if not found.
 */
export function useServiceCategory(categoryId: string): ServiceCategory {
  const categories = useServiceCategories();
  return useMemo(
    () => categories.find((category) => category.id === categoryId) || categories[0],
    [categories, categoryId],
  );
}

/**
 * Returns the list of categories available for scheduled bookings.
 */
export function useScheduledCategories(): ScheduledCategory[] {
  const { ready, scheduledCategories } = useData();
  return ready && scheduledCategories.length ? scheduledCategories : fixtureScheduledCategories;
}
