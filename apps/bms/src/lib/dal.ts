import "server-only"

import { cache } from "react"
import { redirect, forbidden } from "next/navigation"
import { auth } from "@/auth"

export const verifySession = cache(async () => {
  const session = await auth()
  if (!session?.user) redirect("/sign-in")
  return session
})

const ADMIN_ROLES = ["SUPER_ADMIN", "OWNER", "ADMIN"]

export const verifyAdmin = cache(async () => {
  const session = await verifySession()
  if (!ADMIN_ROLES.includes(session.user?.role ?? "")) forbidden()
  return session
})

// Least-privilege read guard (M3): only OWNER/ADMIN/SUPER_ADMIN may see third-party
// PII (taxId, nationalId, phone, address, notes). Lower roles (COMERCIAL/FINANCE/
// USER) keep navigation but get those fields redacted in the query layer.
export const REDACTED = "•••" as const

export function isPrivileged(role?: string | null): boolean {
  return ADMIN_ROLES.includes(role ?? "")
}

/** True when the current session may view sensitive PII. Cached via verifySession. */
export async function canViewSensitive(): Promise<boolean> {
  const session = await verifySession()
  return isPrivileged(session.user?.role)
}
