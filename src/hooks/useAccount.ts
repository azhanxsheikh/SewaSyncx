import { useMemo } from 'react';
import {
  clientProfile,
  clientStats,
  familyMembers,
  notifications,
  savedAddresses,
} from '../fixtures/account.fixture';
import type {
  ClientStats,
  FamilyMember,
  NotificationRecord,
  SavedAddress,
} from '../types/domain';

/**
 * Read contracts for the signed-in client's own records.
 *
 * Target state: each of these becomes a Supabase query scoped by
 * `auth.uid()` under the owner-only policies in `docs/DATABASE.md` §12.
 */

export function useClientProfile(): typeof clientProfile {
  return clientProfile;
}

export function useClientStats(): ClientStats {
  return clientStats;
}

export function useSavedAddresses(): SavedAddress[] {
  return savedAddresses;
}

export function useFamilyMembers(): FamilyMember[] {
  return familyMembers;
}

/**
 * Resolves a family member by id, falling back to the first record.
 *
 * The fallback preserves the original screen behaviour, which rendered the
 * first member when a selection could not be resolved.
 */
export function useFamilyMember(memberId: string): FamilyMember {
  return useMemo(
    () => familyMembers.find((member) => member.id === memberId) || familyMembers[0],
    [memberId],
  );
}

export function useNotifications(): NotificationRecord[] {
  return notifications;
}
