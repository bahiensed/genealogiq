import "server-only"

// Published authorization contract for this app (régua surface). Aggregates the
// session-bound guards (DAL) with the reusable primitives and the rate-limit guard.
// SEQ is tenant-scoped: verifyTenantSession resolves the active customer/tenant.
export {
  verifySession,
  verifyTenantSession,
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
