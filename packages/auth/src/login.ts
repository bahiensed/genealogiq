import { AuthError } from "next-auth"
import { getClientIp, checkRateLimit } from "@genealogiq/services/rate-limit"
import { SignInSchema } from "./schemas"
import { lockoutRemainingMinutes, nextFailedLoginState } from "./lockout"

/** Stable error keys; the per-app wrapper localizes them via getTranslations('Actions').
 *  `invalidData` maps to the shared common.invalidData; the rest live under Actions.auth.*. */
export type LoginErrorKey =
  | "invalidData"
  | "tooManySignIn"
  | "accountLocked"
  | "verifyEmailFirst"
  | "incorrectCredentials"

export type LoginActionResult =
  | { errorKey: LoginErrorKey; values?: Record<string, string | number> }
  | undefined

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
    if (!validated.success) return { errorKey: "invalidData" }

    // Optional post-login destination supplied by the form. Accept only an
    // internal path (starts with "/" but not "//", which would be a
    // protocol-relative open redirect); otherwise fall back to the app default.
    // BMS/SEQ never send this field, so their behaviour is unchanged.
    const rawCallback = formData.get("callbackUrl")
    const redirectTo =
      typeof rawCallback === "string" && rawCallback.startsWith("/") && !rawCallback.startsWith("//")
        ? rawCallback
        : opts.redirectTo

    const ip = await getClientIp()
    const limit = await checkRateLimit({ key: `signin:ip:${ip}`, maxAttempts: 10, windowSeconds: 300 })
    if (!limit.allowed) return { errorKey: "tooManySignIn", values: { seconds: limit.retryAfter } }

    const user = await opts.loadLockoutFields(validated.data.email)

    const lockedMinutes = lockoutRemainingMinutes(user?.lockedUntil ?? null)
    if (lockedMinutes !== null) {
      return { errorKey: "accountLocked", values: { minutes: lockedMinutes } }
    }

    if (user && user.emailVerified === null) {
      return { errorKey: "verifyEmailFirst" }
    }

    try {
      await opts.signIn("credentials", { ...validated.data, redirectTo })
    } catch (error) {
      if (error instanceof AuthError) {
        if (user) await opts.persistFailedLogin(user.id, nextFailedLoginState(user))
        return { errorKey: "incorrectCredentials" }
      }
      throw error // re-throw so the post-signIn redirect propagates
    }
    return undefined
  }
}
