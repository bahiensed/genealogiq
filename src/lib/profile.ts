export type Manageable = {
  id: string
  guardedBy: { guardianId: string }[]
}

export function canManageProfile(profile: Manageable, sessionUserId: string): boolean {
  return profile.id === sessionUserId || profile.guardedBy.some((g) => g.guardianId === sessionUserId)
}
