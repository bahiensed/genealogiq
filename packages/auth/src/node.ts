import NextAuth, { type NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { SignInSchema } from "./schemas"
import type { AppPrincipal, AuthUserRow } from "./types"

export interface CreateAuthOptions<Row extends AuthUserRow> {
  /** Edge-safe config from createEdgeAuthConfig() — provides cookies, pages,
   *  the session + authorized callbacks. */
  edgeConfig: NextAuthConfig
  /** App-specific identity lookup (prisma.user / prisma.appUser by email). */
  loadUserByEmail: (email: string) => Promise<Row | null>
  /** Map the loaded row to the canonical principal stored in the session. */
  toPrincipal: (row: Row) => AppPrincipal
  /** Clear failedLoginAttempts/lockedUntil on the app's identity table.
   *  Returns the prisma update promise (any value) — we only await it. */
  resetLockout: (id: string) => Promise<unknown>
  /** Optional extra gate after password check (SEQ: row must have a tenantId). */
  extraGate?: (row: Row) => boolean
}

/**
 * The single canonical NextAuth setup for all three apps. The credential
 * `authorize` flow is identical everywhere — including UNIFORM lockout
 * enforcement (`lockedUntil`), which previously only APP did. Apps supply only
 * their identity lookup, field mapping, lockout reset, and optional extra gate.
 */
export function createAuth<Row extends AuthUserRow>(opts: CreateAuthOptions<Row>) {
  return NextAuth({
    ...opts.edgeConfig,
    providers: [
      Credentials({
        credentials: { email: {}, password: {} },
        authorize: async (credentials) => {
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

          // AppPrincipal is assignable to the (augmented) NextAuth User.
          return opts.toPrincipal(row) as unknown as ReturnType<typeof opts.toPrincipal> & { id: string }
        },
      }),
    ],
    callbacks: {
      ...opts.edgeConfig.callbacks,
      jwt({ token, user, trigger, session }) {
        if (user) {
          const p = user as unknown as AppPrincipal
          token.id    = p.id
          token.name  = p.name
          token.role  = p.role
          token.image = p.image ?? null
          if (p.customerId !== undefined) token.customerId = p.customerId
        }
        if (trigger === "update" && session && typeof session === "object" && "image" in session) {
          token.image = (session as { image: string | null }).image
        }
        return token
      },
    },
  })
}
