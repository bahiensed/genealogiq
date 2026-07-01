import { notFound, redirect } from "next/navigation"

// Shared access gate for the public (memorial) profile read pages. Anonymous
// visitors may view only existing memorials; "missing id" and "living profile" are
// treated identically (both redirect to sign-in) so the response shape never reveals
// whether an id exists (no 404-vs-redirect enumeration). notFound() fires only for
// authenticated viewers on a missing id. Asserts `profile` non-null afterwards.
export function assertPublicMemorialAccess<T extends { role: string }>(
  profile: T | null,
  viewerId: string | undefined,
  profileId: string,
): asserts profile is T {
  if (!viewerId && (!profile || profile.role !== "APP_MEMO")) {
    redirect(`/sign-in?callbackUrl=${encodeURIComponent(`/profile/${profileId}`)}`)
  }
  if (!profile) notFound()
}
