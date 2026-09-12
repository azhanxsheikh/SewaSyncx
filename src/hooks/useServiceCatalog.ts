import { useMemo } from 'react';
import {
  diagnosticQuestions,
  priorityLevels,
  scheduledCategories,
  scheduledOfferings,
  serviceCategories,
} from '../fixtures/services.fixture';
import type {
  DiagnosticQuestion,
  PriorityLevel,
  ScheduledCategory,
  ServiceCategory,
  ServiceOffering,
} from '../types/domain';

/**
 * Read contracts for the service catalogue.
 *
 * These hooks return data synchronously. That is deliberate: every consumer
 * renders the result directly, so introducing a loading state here would
 * require touching JSX in every screen and risk a blank first paint.
 * When Supabase replaces the fixtures, preserve the synchronous contract by
 * hydrating the catalogue once at the app boundary (it is small and static)
 * rather than making each of these hooks async.
 */

export function useServiceCategories(): ServiceCategory[] {
  return serviceCategories;
}

export function useServiceCategory(categoryId: string): ServiceCategory {
  return useMemo(
    () => serviceCategories.find((category) => category.id === categoryId) || serviceCategories[0],
    [categoryId],
  );
}

export function useScheduledCategories(): ScheduledCategory[] {
  return scheduledCategories;
}

export function useScheduledOfferings(categoryId: string): ServiceOffering[] {
  return useMemo(
    () => scheduledOfferings[categoryId] || scheduledOfferings.default,
    [categoryId],
  );
}

export function usePriorityLevels(): PriorityLevel[] {
  return priorityLevels;
}

export function useDiagnosticQuestions(categoryId: string): DiagnosticQuestion[] {
  return useMemo(
    () => diagnosticQuestions[categoryId] || diagnosticQuestions.default,
    [categoryId],
  );
}
