import bcrypt from "bcryptjs"
import { SignInSchema } from "./schemas"
import type { AppPrincipal, AuthUserRow } from "./types"

export interface AuthorizeOptions<Row extends AuthUserRow> {
  loadUserByEmail: (email: string) => Promise<Row | null>
  toPrincipal: (row: Row) => AppPrincipal
  resetLockout: (id: string) => Promise<unknown>
  extraGate?: (row: Row) => boolean
}

/**
 * The single canonical credential check shared by all three apps. Returns the
 * principal on success or null on any failure. Enforced uniformly:
 * schema → user exists → verified → active → has password → NOT locked out →
 * password matches → extra gate. Lockout (`lockedUntil`) is checked here for
 * every app (previously only APP did this in `authorize`).
 *
 * Extracted from the NextAuth provider so it can be unit-tested without booting
 * NextAuth.
 */
export async function authorizeUser<Row extends AuthUserRow>(
  credentials: unknown,
  opts: AuthorizeOptions<Row>,
): Promise<AppPrincipal | null> {
  const validated = SignInSchema.safeParse(credentials)
  if (!validated.success) return null

  const { email, password } = validated.data

  const row = await opts.loadUserByEmail(email)
  if (!row) return null

  if (row.emailVerified === null) return null   // unverified
  if (!row.isActive) return null                // deactivated
  if (!row.password) return null                // invited, no password yet
  if (row.lockedUntil && row.lockedUntil > new Date()) return null // locked out

  const match = await bcrypt.compare(password, row.password)
  if (!match) return null

  if (row.failedLoginAttempts > 0 || row.lockedUntil) {
    await opts.resetLockout(row.id)
  }

  if (opts.extraGate && !opts.extraGate(row)) return null

  return opts.toPrincipal(row)
}
