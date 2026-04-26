import type { ProfileRow } from "@/queries/profile"

export function canManageProfile(profile: ProfileRow, sessionUserId: string): boolean {
  return profile.id === sessionUserId || profile.guardedBy.some((g) => g.guardianId === sessionUserId)
}
