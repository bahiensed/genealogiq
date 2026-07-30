import type { Profile } from "next-auth"
import type { AuthUserRow } from "./types"

export interface GoogleAuthOptions<Row extends AuthUserRow> {
  clientId: string
  clientSecret: string
  /**
   * APP: true (self-service — mirrors the existing public `signUp` action).
   * BMS/SEQ: false — Google can only authenticate an ALREADY-invited `User`
   * row; it must never be a self-registration path for internal staff.
   */
  allowSelfSignup: boolean
  /** Required iff allowSelfSignup is true (enforced at runtime in createAuth()). */
  createUserFromGoogleProfile?: (profile: Profile) => Promise<Row>
  /**
   * Bookkeeping only — `googleId` is never the sign-in lookup key (email is,
   * same as Credentials). Called on every successful Google sign-in against
   * an EXISTING row to refresh google_id and (if unset) emailVerified.
   * Failures here must never block an otherwise-legitimate login.
   */
  syncGoogleLink: (row: Row, profile: Profile) => Promise<unknown>
}

export interface ResolveGoogleSignInOptions<Row extends AuthUserRow> {
  loadUserByEmail: (email: string) => Promise<Row | null>
  resetLockout: (id: string) => Promise<unknown>
  extraGate?: (row: Row) => boolean
  google: GoogleAuthOptions<Row>
}

/**
 * The OAuth analog of `authorizeUser()` (see authorize.ts) — the single
 * canonical Google-account resolution check. Returns the row to log in as, or
 * null to deny. Applies the SAME extraGate/isActive/lockout-reset semantics
 * Credentials already uses, via the same opts, so the two providers cannot
 * drift apart.
 *
 * Extracted from the NextAuth `signIn` callback so it can be unit-tested
 * without booting NextAuth — same reasoning as `authorizeUser`.
 */
export async function resolveGoogleSignIn<Row extends AuthUserRow>(
  profile: Profile | undefined,
  opts: ResolveGoogleSignInOptions<Row>,
): Promise<Row | null> {
  // Never trust an OAuth email next-auth didn't itself verify with the IdP.
  if (!profile?.email || !profile.email_verified || !profile.sub) return null

  const email = profile.email.toLowerCase()
  let row = await opts.loadUserByEmail(email)

  if (row) {
    try {
      await opts.google.syncGoogleLink(row, profile)
    } catch (err) {
      // Bookkeeping write only — never fail an otherwise-legitimate login over it.
      console.error("[auth] syncGoogleLink failed", err)
    }
  } else {
    if (!opts.google.allowSelfSignup || !opts.google.createUserFromGoogleProfile) return null
    try {
      row = await opts.google.createUserFromGoogleProfile(profile)
    } catch (err) {
      // Rare TOCTOU: two concurrent first-time Google sign-ins for the same
      // brand-new email both pass loadUserByEmail above before either INSERT
      // commits; the email unique index rejects the loser. Re-resolve as an
      // auto-link instead of failing the sign-in outright.
      const retry = await opts.loadUserByEmail(email)
      if (!retry) throw err
      row = retry
    }
  }

  if (!row.isActive) return null
  if (opts.extraGate && !opts.extraGate(row)) return null

  // Proof of a successful Google sign-in is the same trust level as a correct
  // password — clear any Credentials-brute-force lockout, same as resetLockout
  // already does for a correct password (see authorize.ts).
  if (row.failedLoginAttempts > 0 || row.lockedUntil) {
    await opts.resetLockout(row.id)
  }

  return row
}
