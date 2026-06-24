// Published, reusable authorization primitives (régua contract). Pure logic — no
// next/prisma/server-only imports — so it stays unit-testable and importable
// anywhere (server actions, RSC, route handlers, tests). Session-bound guards live
// in the DAL (createDal/createTenantDal); the per-app `lib/authz.ts` barrel aggregates both.

export class ForbiddenError extends Error {
  readonly status = 403
  constructor(message = "Forbidden") {
    super(message)
    this.name = "ForbiddenError"
  }
}

export class NotFoundError extends Error {
  readonly status = 404
  constructor(message = "Not found") {
    super(message)
    this.name = "NotFoundError"
  }
}

/**
 * Cosmetic boolean — NEVER throws. Use to hide/disable UI affordances (compute it
 * server-side and pass the boolean to client components). Not a security boundary.
 */
export function can<R>(record: R | null | undefined, matches: (record: R) => boolean): boolean {
  return record != null && matches(record)
}

export type OwnershipResult<R> =
  | { ok: true; record: R }
  | { ok: false; error: string }

/**
 * Form-friendly ownership check. Returns a discriminated result instead of throwing,
 * so a Server Action can turn it into `{ error }` for the form's toast. Centralizes
 * the per-object ownership predicate that was previously hand-rolled at each site.
 */
export function assertOwnership<R>(
  record: R | null | undefined,
  matches: (record: R) => boolean,
  error = "Not authorized.",
): OwnershipResult<R> {
  return record != null && matches(record)
    ? { ok: true, record }
    : { ok: false, error }
}

/**
 * Régua ownership guard for NEW code / non-form callers (RSC loaders, route
 * handlers): returns the record typed non-null, or throws NotFoundError (404) so
 * existence isn't leaked. In an RSC/route that wants Next's native not-found page,
 * pass `{ onFail: notFound }`. Inside a form-invoked action prefer `assertOwnership`
 * (a thrown navigation has no boundary to land on from a client transition).
 */
export function requireOwnership<R>(
  record: R | null | undefined,
  matches: (record: R) => boolean,
  opts?: { onFail?: () => never },
): R {
  if (record != null && matches(record)) return record
  if (opts?.onFail) opts.onFail()
  throw new NotFoundError()
}
