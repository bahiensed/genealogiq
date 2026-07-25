import NextAuth, { type NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { authorizeUser } from "./authorize"
import { SESSION_MAX_AGE_SECONDS } from "./edge"
import type { AppPrincipal, AuthUserRow } from "./types"

/** The JWT payload shape a real login produces — extracted so out-of-band
 *  session-minting code (next-auth/jwt's encode(), called directly instead of
 *  through signIn()) can reuse the exact same shape instead of re-deriving it.
 *  `email`/`sub` are included explicitly here even though a normal login's
 *  token already has them pre-populated by @auth/core before the jwt()
 *  callback below runs — encode() starts from an empty token, so this is the
 *  only place those two fields get set for an out-of-band mint. */
export function buildSessionToken(p: AppPrincipal): Record<string, unknown> {
  return {
    name:  p.name,
    email: p.email,
    sub:   p.id,
    id:    p.id,
    role:  p.role,
    image: p.image ?? null,
    ...(p.customerId !== undefined ? { customerId: p.customerId } : {}),
  }
}

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
    // Explicit: the Credentials provider has no DB session table — sessions are
    // stateless JWTs (the edge authorized()/jwt callbacks read role/customerId
    // from the token). This is NextAuth's default for Credentials, declared here
    // so the strategy and its implications aren't implicit. `maxAge` was also
    // an implicit default — see SESSION_MAX_AGE_SECONDS's own comment in edge.ts.
    session: { strategy: "jwt", maxAge: SESSION_MAX_AGE_SECONDS },
    providers: [
      Credentials({
        credentials: { email: {}, password: {} },
        authorize: async (credentials) => {
          const principal = await authorizeUser(credentials, opts)
          // AppPrincipal is assignable to the (augmented) NextAuth User.
          return principal as unknown as (AppPrincipal & { id: string }) | null
        },
      }),
    ],
    callbacks: {
      ...opts.edgeConfig.callbacks,
      jwt({ token, user, trigger, session }) {
        if (user) {
          Object.assign(token, buildSessionToken(user as unknown as AppPrincipal))
        }
        if (trigger === "update" && session && typeof session === "object" && "image" in session) {
          token.image = (session as { image: string | null }).image
        }
        return token
      },
    },
  })
}
