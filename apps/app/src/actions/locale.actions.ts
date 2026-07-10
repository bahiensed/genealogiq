"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { isSupportedLocale } from "@genealogiq/i18n"

/**
 * Persists the user's language choice on AppUser.preferredLocale so push
 * payloads (built at send time, where the locale cookie of the recipient is
 * unavailable) come out in their language.
 *
 * Uses auth() directly instead of verifySession(): the language switcher also
 * renders for guests, and switching language must never redirect to sign-in.
 * Fire-and-forget — a failure only means a push arrives in the old language.
 */
export async function updatePreferredLocale(locale: unknown): Promise<void> {
  if (!isSupportedLocale(locale)) return
  try {
    const session = await auth()
    if (!session?.user?.id) return
    await prisma.appUser.update({
      where: { id: session.user.id },
      data: { preferredLocale: locale },
    })
  } catch {
    // Non-critical; swallow.
  }
}
