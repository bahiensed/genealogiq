import type { NextAuthConfig } from "next-auth"

export interface EdgeAuthOptions {
  /** Per-app session cookie name — deliberately unique to isolate subdomains. */
  cookieName: string
  routes: {
    /** Path prefixes that require a logged-in user. */
    protected: string[]
    /** Auth pages (sign-in, sign-up, forgot-password…) to bounce logged-in users away from. */
    auth: string[]
    /** Where to send an already-authenticated user who hits an auth page. */
    afterLogin: string
  }
  /**
   * SEQ only: a logged-in user without a tenant (`customerId`) is not a valid
   * Sequoia user — bounce them back to sign-in and don't treat them as "logged in"
   * for the purpose of leaving auth pages.
   */
  requireCustomerId?: boolean
}

// Canonical session callback (edge-safe: reads the JWT only). Shared by the edge
// config and the node config so middleware and server both see the same shape.
// `session` is the full NextAuth Session (incl. `expires`); we mutate user fields
// and return it as-is.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applySession(session: any, token: Record<string, unknown>) {
  if (token.id) session.user.id = token.id as string
  if (token.role) session.user.role = token.role as string
  if (token.image !== undefined) session.user.image = token.image as string | null
  if (token.customerId) session.user.customerId = token.customerId as string
  return session
}

/**
 * Edge-safe NextAuth config (no DB / bcrypt). Used directly by middleware and
 * spread into the node config. The canonical `session` + `authorized` callbacks
 * live here; the node factory only adds the `jwt` callback and the credentials
 * provider.
 */
export function createEdgeAuthConfig(opts: EdgeAuthOptions) {
  return {
    cookies: {
      sessionToken: { name: opts.cookieName },
    },
    pages: {
      signIn: "/sign-in",
    },
    providers: [],
    callbacks: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      session({ session, token }: any) {
        return applySession(session, token as Record<string, unknown>)
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      authorized({ auth, request: { nextUrl } }: any) {
        const isLoggedIn = !!auth?.user
        const customerId = auth?.user?.customerId
        const pathname = nextUrl.pathname

        const isProtected = opts.routes.protected.some((r) => pathname.startsWith(r))
        const isAuthRoute = opts.routes.auth.some((r) => pathname.startsWith(r))

        if (isProtected && !isLoggedIn) return false

        // SEQ: logged in but tenant-less → not a valid session here.
        if (opts.requireCustomerId && isProtected && isLoggedIn && !customerId) {
          return Response.redirect(new URL("/sign-in", nextUrl))
        }

        // Bounce authenticated users off auth pages. For SEQ this only applies
        // once they actually have a tenant.
        if (isAuthRoute && isLoggedIn && (!opts.requireCustomerId || customerId)) {
          return Response.redirect(new URL(opts.routes.afterLogin, nextUrl))
        }

        return true
      },
    },
  } satisfies NextAuthConfig
}
