import "server-only"

import { cache } from "react"
import { redirect, forbidden } from "next/navigation"

// Minimal session shape the DAL relies on (matches the canonical augmentation).
interface SessionLike {
  user: { id: string; role: string; customerId?: string | null }
}

export interface CreateDalOptions {
  /** The app's NextAuth `auth()` accessor. */
  auth: () => Promise<SessionLike | null>
  /** Roles allowed through verifyAdmin / treated as privileged. */
  adminRoles: string[]
  /** SEQ: verifyAdmin and the base session require a tenant (`customerId`). */
  tenantScoped?: boolean
}

/** Redaction marker for PII shown to non-privileged roles (M3). */
export const REDACTED = "•••" as const

export function isPrivileged(role: string | null | undefined, adminRoles: string[]): boolean {
  return adminRoles.includes(role ?? "")
}

/**
 * Canonical data-access guards for all three apps. One implementation; the only
 * per-app facts are `adminRoles` and whether the app is `tenantScoped` (SEQ).
 */
export function createDal(opts: CreateDalOptions) {
  const verifySession = cache(async () => {
    const session = await opts.auth()
    if (!session?.user) redirect("/sign-in")
    return session
  })

  const verifyTenantSession = cache(async () => {
    const session = await verifySession()
    const customerId = session.user.customerId
    if (!customerId) redirect("/sign-in")
    return { ...session, customerId }
  })

  const base = opts.tenantScoped ? verifyTenantSession : verifySession

  const verifyAdmin = cache(async () => {
    const session = await base()
    if (!opts.adminRoles.includes(session.user.role ?? "")) forbidden()
    return session
  })

  const canViewSensitive = async (): Promise<boolean> => {
    const session = await verifySession()
    return opts.adminRoles.includes(session.user.role ?? "")
  }

  return { verifySession, verifyTenantSession, verifyAdmin, canViewSensitive, REDACTED }
}
