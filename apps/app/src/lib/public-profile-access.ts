import { notFound, redirect } from "next/navigation"

// Shared access gate for every public profile read page. Anonymous visitors
// may view:
//   - any memorial (APP_MEMO) — unconditionally, memorials have always been public.
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
export function assertPublicMemorialAccess<T extends { role: string; isPublicProfile: boolean }>(
  profile: T | null,
  viewerId: string | undefined,
  profileId: string,
): asserts profile is T {
  const isPublic = !!profile && (
    profile.role === "APP_MEMO" ||
    (profile.role === "APP_USER" && profile.isPublicProfile)
  )
  if (!viewerId && !isPublic) {
    redirect(`/sign-in?callbackUrl=${encodeURIComponent(`/profile/${profileId}`)}`)
  }
  if (!profile) notFound()
}
