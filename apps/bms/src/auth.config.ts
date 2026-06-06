import type { NextAuthConfig } from "next-auth"

// Edge-safe config — sem imports de banco de dados
export const authConfig = {
  cookies: {
    sessionToken: { name: "bms.session-token" },
  },
  pages: {
    signIn: "/sign-in",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const pathname = nextUrl.pathname

      const isProtected = [
        "/profile", "/dashboard", "/system", "/categories",
        "/suppliers", "/subscriptions", "/products", "/services", "/customers",
        "/purchasing", "/inventory", "/sales", "/finance",
      ].some((r) => pathname.startsWith(r))
      const isAuthRoute = ["/sign-in", "/setup", "/forgot-password"].some((r) =>
        pathname.startsWith(r)
      )

      if (isProtected && !isLoggedIn) return false
      if (isAuthRoute && isLoggedIn) {
        return Response.redirect(new URL("/dashboard", nextUrl))
      }

      return true
    },
  },
} satisfies NextAuthConfig
