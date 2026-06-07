import type { NextAuthConfig } from "next-auth"

// Edge-safe config — no database imports
export const authConfig = {
  cookies: {
    sessionToken: { name: "seq.session-token" },
  },
  pages: {
    signIn: "/sign-in",
  },
  providers: [],
  callbacks: {
    session({ session, token }) {
      const t = token as Record<string, unknown>
      if (t.customerId) session.user.customerId = t.customerId as string
      return session
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const customerId = auth?.user?.customerId
      const pathname = nextUrl.pathname

      const isProtected = [
        "/profile", "/dashboard", "/system", "/categories",
        "/suppliers", "/products", "/services", "/customers",
        "/purchasing", "/inventory", "/sales", "/finance",
      ].some((r) => pathname.startsWith(r))
      const isAuthRoute = ["/sign-in", "/forgot-password"].some((r) =>
        pathname.startsWith(r)
      )

      if (isProtected && !isLoggedIn) return false
      if (isProtected && isLoggedIn && !customerId) {
        return Response.redirect(new URL("/sign-in", nextUrl))
      }
      if (isAuthRoute && isLoggedIn && customerId) {
        return Response.redirect(new URL("/dashboard", nextUrl))
      }

      return true
    },
  },
} satisfies NextAuthConfig
