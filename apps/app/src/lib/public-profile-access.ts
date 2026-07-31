import { notFound, redirect } from "next/navigation"

// Shared access gate for every public profile read page. Anonymous visitors
// may view:
//   - any memorial (APP_MEMO) — unconditionally, memorials have always been public.
//   - any pet (APP_PET) — unconditionally, same rationale as memorials (no
//     opt-out toggle; a pet has no account of its own to set one from).
//   - a living user's (APP_USER) profile, UNLESS they've opted out via isPublicProfile=false.
// APP_GHOST is deliberately excluded from the public branch: a ghost has no
// account/session and therefore no way to ever set isPublicProfile itself,
// and (today) no guardian-facing UI to toggle it either. This is written as
// a positive allow-list (role === "APP_USER") rather than a negation
// (role !== "APP_MEMO") specifically so it can never accidentally include
// ghosts.
//
// "Missing id", "living-but-opted-out", and "ghost" are all treated
// identically for an anonymous viewer (redirect to sign-in) — never
// notFound() — so the response shape never discloses which case applies (no
// 404-vs-redirect enumeration). notFound() fires only for authenticated
// viewers on a genuinely missing id. Asserts `profile` non-null afterwards.
// Pulled out so any other read path that lists/previews OTHER profiles (e.g.
// Favorites) can apply the identical "what counts as public" rule instead of
// re-deriving it — the family-tree redaction bug happened because this exact
// rule lived in more than one place and drifted.
export function isProfilePubliclyVisible(profile: { role: string; isPublicProfile: boolean }): boolean {
  return (
    profile.role === "APP_MEMO" ||
    profile.role === "APP_PET" ||
    (profile.role === "APP_USER" && profile.isPublicProfile)
  )
}

export function assertPublicMemorialAccess<T extends { role: string; isPublicProfile: boolean }>(
  profile: T | null,
  viewerId: string | undefined,
  profileId: string,
): asserts profile is T {
  const isPublic = !!profile && isProfilePubliclyVisible(profile)
  if (!viewerId && !isPublic) {
    redirect(`/sign-in?callbackUrl=${encodeURIComponent(`/profile/${profileId}`)}`)
  }
  if (!profile) notFound()
}
