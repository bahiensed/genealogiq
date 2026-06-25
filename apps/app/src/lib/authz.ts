import "server-only"

// Published authorization contract for this app (régua surface). Aggregates the
// session-bound guards (DAL) with the reusable primitives, the rate-limit guard,
// and APP's per-object ownership predicate (canManageProfile: owner OR accepted
// guardian). Use `assertOwnership(profile, p => canManageProfile(p, uid))` in form
// actions; `requireOwnership` (404) for non-form callers.
export {
  verifySession,
  verifyAdmin,
  canViewSensitive,
  REDACTED,
  requireSession,
  requireRole,
} from "@/lib/dal"

export {
  ForbiddenError,
  NotFoundError,
  can,
  requireOwnership,
  assertOwnership,
} from "@genealogiq/auth/authz"
export type { OwnershipResult } from "@genealogiq/auth/authz"

export { TooManyRequestsError, requireWithinRateLimit } from "@genealogiq/services/rate-limit"

export { canManageProfile } from "@/lib/profile"
