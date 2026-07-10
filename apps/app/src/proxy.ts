import NextAuth from "next-auth"
import { authConfig } from "@/auth.config"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const { auth } = NextAuth(authConfig)

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default auth(function proxy(_req: NextRequest) {
  return NextResponse.next()
})

export const config = {
  // Excludes API routes, Next internals, and PWA/static assets (service
  // worker, manifest, favicon, fonts/, icons/, common image/font extensions)
  // — none of them need the auth proxy, and the SW/manifest must not pay the
  // JWT-decode cost on every fetch. Pages (including /offline) stay matched.
  matcher: [
    "/((?!api|_next/static|_next/image|sw\\.js|manifest\\.webmanifest|favicon\\.ico|fonts/|icons/|.*\\.(?:png|jpg|jpeg|webp|svg|ico|woff2?)$).*)",
  ],
}
