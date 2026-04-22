import type { ProfileRow } from "@/queries/profile"

export function canManageProfile(profile: ProfileRow, sessionUserId: string): boolean {
  return profile.id === sessionUserId || profile.createdById === sessionUserId
}
