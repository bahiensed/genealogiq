import { AuthError } from "next-auth"
import { getClientIp, checkRateLimit } from "@genealogiq/services/rate-limit"
import { SignInSchema } from "./schemas"
import { lockoutRemainingMinutes, nextFailedLoginState } from "./lockout"

export type LoginActionResult = { error?: string } | undefined

interface LockoutFields {
  id: string
  emailVerified: Date | null
  lockedUntil: Date | null
  failedLoginAttempts: number
}

export interface CreateLoginActionOptions {
  /** The app's NextAuth signIn(). Throws a redirect on success, AuthError on bad creds.
   *  `options` is loosely typed to accept NextAuth's overloaded signIn signature. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  signIn: (provider: string, options: any) => Promise<unknown>
  /** Load just the lockout-relevant fields by email (prisma.user / prisma.appUser). */
  loadLockoutFields: (email: string) => Promise<LockoutFields | null>
  /** Persist the new failedLoginAttempts/lockedUntil on the app's identity table. */
  persistFailedLogin: (
    id: string,
    state: { failedLoginAttempts: number; lockedUntil: Date | null },
  ) => Promise<unknown>
  /** Where to land on a successful sign-in (BMS/SEQ "/dashboard", APP "/home"). */
  redirectTo: string
}

/**
 * The single canonical sign-in server action for all three apps. Rate-limits by
 * IP, blocks locked-out/unverified accounts, delegates the credential check to
 * NextAuth, and on failure advances the lockout counter using the shared policy.
 * Apps supply only their identity lookups, signIn, and redirect target.
 */
export function createLoginAction(opts: CreateLoginActionOptions) {
  return async function login(_prevState: unknown, formData: FormData): Promise<LoginActionResult> {
    const validated = SignInSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
    })
    if (!validated.success) return { error: "Invalid data" }

    const ip = await getClientIp()
    const limit = await checkRateLimit({ key: `signin:ip:${ip}`, maxAttempts: 10, windowSeconds: 300 })
    if (!limit.allowed) return { error: `Too many sign-in attempts. Try again in ${limit.retryAfter}s.` }

    const user = await opts.loadLockoutFields(validated.data.email)

    const lockedMinutes = lockoutRemainingMinutes(user?.lockedUntil ?? null)
    if (lockedMinutes !== null) {
      return { error: `Account temporarily locked. Try again in ${lockedMinutes} minute(s).` }
    }

    if (user && user.emailVerified === null) {
      return { error: "Please verify your email before signing in. Check your inbox." }
    }

    try {
      await opts.signIn("credentials", { ...validated.data, redirectTo: opts.redirectTo })
    } catch (error) {
      if (error instanceof AuthError) {
        if (user) await opts.persistFailedLogin(user.id, nextFailedLoginState(user))
        return { error: "Incorrect email or password" }
      }
      throw error // re-throw so the post-signIn redirect propagates
    }
    return undefined
  }
}
