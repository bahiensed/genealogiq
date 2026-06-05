export type Manageable = {
  id: string
  guardedBy: { guardianId: string; status?: string }[]
}

export function canManageProfile(profile: Manageable, sessionUserId: string): boolean {
  if (profile.id === sessionUserId) return true
  // A guardian grants management rights only once the guardianship is ACCEPTED.
  // PENDING/REJECTED rows must never grant access. We reject those explicitly so
  // the function is safe even if a caller forgets to pre-filter `guardedBy` by
  // status (anyone can create a PENDING guardianship request on a memorial).
  return profile.guardedBy.some(
    (g) => g.guardianId === sessionUserId && g.status !== "PENDING" && g.status !== "REJECTED",
  )
}
