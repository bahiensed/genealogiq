import { NextRequest, NextResponse } from "next/server"
import { encode } from "next-auth/jwt"
import { hashToken } from "@genealogiq/core"
import { buildSessionToken } from "@genealogiq/auth"
import { SESSION_MAX_AGE_SECONDS } from "@genealogiq/auth/edge"
import { authConfig } from "@/auth.config"
import { toPrincipal } from "@/auth"
import { prisma } from "@/lib/prisma"
import { safeCallback } from "@/lib/safe-callback"
import { getClientIp, checkRateLimit } from "@/lib/rate-limit"

// Auto-login on email verification: clicking the emailed link marks the
// account verified AND mints a real session, instead of dropping the user on
// a "click here to sign in" card. Only owns the success path (a valid,
// unexpired VERIFICATION-type token) — every other case (missing/invalid/
// expired token, wrong type, rate-limited) bounces back to the unmodified
// /verify-email page, which re-derives and renders the correct card exactly
// as it does today. This keeps that page's existing behavior (including the
// CHANGE-email-confirmation flow, which never routes through here — see
// packages/email/src/index.ts) untouched.
export const dynamic = "force-dynamic"

const SELECT = { id: true, email: true, firstName: true, lastName: true, role: true } as const

function backToPage(request: NextRequest, token: string | null, callbackUrl: string | null) {
  const url = new URL("/verify-email", request.url)
  if (token) url.searchParams.set("token", token)
  if (callbackUrl) url.searchParams.set("callbackUrl", callbackUrl)
  return NextResponse.redirect(url)
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token")
  const callbackUrl = safeCallback(request.nextUrl.searchParams.get("callbackUrl"))
  if (!token) return backToPage(request, null, callbackUrl)

  const ip = await getClientIp()
  const limit = await checkRateLimit({ key: `verify-email:ip:${ip}`, maxAttempts: 10, windowSeconds: 3600 })
  // Rate-limited: bounce back with the original token still intact — the page
  // will verify it normally (it's not expired), just without auto-login this
  // once. Not an error state, so no new copy to write for it.
  if (!limit.allowed) return backToPage(request, token, callbackUrl)

  const hashed = hashToken(token)
  const record = await prisma.emailToken.findUnique({ where: { token: hashed } })
  if (!record || record.expiresAt < new Date() || record.type !== "VERIFICATION") {
    return backToPage(request, token, callbackUrl)
  }

  const appUserId = record.appUserId ?? record.userId!

  let user: { id: string; email: string | null; firstName: string; lastName: string; role: string }
  try {
    const [updated] = await prisma.$transaction([
      prisma.appUser.update({ where: { id: appUserId }, data: { emailVerified: new Date() }, select: SELECT }),
      prisma.emailToken.delete({ where: { token: hashed } }),
    ])
    user = updated
  } catch {
    // Most likely a concurrent double-click: the other request already
    // consumed this token. If the account is verified by now, this request
    // just lost a benign race with itself — log it in anyway rather than
    // showing an error for double-clicking a link.
    const already = await prisma.appUser.findUnique({ where: { id: appUserId }, select: { ...SELECT, emailVerified: true } })
    if (!already?.emailVerified) return backToPage(request, token, callbackUrl)
    user = already
  }

  const principal = toPrincipal(user)
  const cookieName = authConfig.cookies!.sessionToken!.name!
  const jwt = await encode({
    token: buildSessionToken(principal),
    secret: process.env.AUTH_SECRET!,
    salt: cookieName, // next-auth derives its own cookie's key from the cookie name, not a free-form value
    maxAge: SESSION_MAX_AGE_SECONDS,
  })

  const response = NextResponse.redirect(new URL(callbackUrl ?? "/home", request.url))
  response.cookies.set(cookieName, jwt, {
    ...authConfig.cookies!.sessionToken!.options,
    secure: request.nextUrl.protocol === "https:",
    expires: new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000),
  })
  return response
}
