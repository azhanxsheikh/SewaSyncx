import { useMemo } from 'react';
import {
  clientProfile as fixtureClientProfile,
  clientStats as fixtureClientStats,
  notifications,
  savedAddresses as fixtureSavedAddresses,
} from '../fixtures/account.fixture';
import { useData } from '../context/DataProvider';
import type {
  ClientStats,
  FamilyMember,
  NotificationRecord,
  SavedAddress,
} from '../types/domain';

/**
 * Read contracts for the signed-in client's own records.
 *
 * Real queries, scoped by `auth.uid()` (src/context/DataProvider.tsx), for
 * everything that has a real table. `notifications` stays fixture-backed —
 * there is no `notifications` table in any migration.
 */

export function useClientProfile() {
  const { ready, clientProfile } = useData();
  return ready && clientProfile ? clientProfile : fixtureClientProfile;
}

export function useClientStats(): ClientStats {
  const { ready, clientStats } = useData();
  return ready && clientStats ? clientStats : fixtureClientStats;
}

export function useSavedAddresses(): SavedAddress[] {
  const { ready, savedAddresses } = useData();
  return ready && savedAddresses.length ? savedAddresses : fixtureSavedAddresses;
}

export function useFamilyMembers(): FamilyMember[] {
  const { ready, familyMembers } = useData();
  return ready ? familyMembers : [];
}

const emptyFamilyMember: FamilyMember = {
  id: '',
  name: 'Family Member',
  relation: '',
  phone: '',
  emoji: '👤',
  color: 'blue',
  address: '',
  area: '',
};

/**
 * Resolves a family member by id, falling back to the first record.
 *
 * The fallback preserves the original screen behaviour, which rendered the
 * first member when a selection could not be resolved.
 */
export function useFamilyMember(memberId: string): FamilyMember {
  const familyMembers = useFamilyMembers();
  return useMemo(
    () => familyMembers.find((member) => member.id === memberId) || familyMembers[0] || emptyFamilyMember,
    [familyMembers, memberId],
  );
}

export function useNotifications(): NotificationRecord[] {
  const { notifications: liveNotifications } = useData();
  return liveNotifications.length ? liveNotifications : notifications;
}

export function useUnreadNotificationsCount(): number {
  const notificationsList = useNotifications();
  return notificationsList.filter((n) => !n.read).length;
}
