import type { NextAuthConfig } from "next-auth"

// Edge-safe config — no database imports
export const authConfig = {
  cookies: {
    sessionToken: { name: "app.session-token" },
  },
  pages: {
    signIn: "/sign-in",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const pathname = nextUrl.pathname

      const isProtected = ["/home", "/profile", "/tree"].some((r) => pathname.startsWith(r))

      const isAuthRoute = ["/sign-in", "/sign-up", "/forgot-password"].some((r) =>
        pathname.startsWith(r)
      )

      if (isProtected && !isLoggedIn) return false
      if (isAuthRoute && isLoggedIn) {
        return Response.redirect(new URL("/home", nextUrl))
      }

      return true
    },
  },
} satisfies NextAuthConfig
