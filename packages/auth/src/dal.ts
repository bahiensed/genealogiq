import "server-only"

import { cache } from "react"
import { redirect, forbidden } from "next/navigation"

// The session shape the DAL relies on. Generic `S` flows the app's real Session
// type through (so session.user.name/email/image stay available); this is just
// the minimum the guards read.
export interface SessionUser {
  id: string
  name?: string | null
  email?: string | null
  image?: string | null
  role: string
  customerId?: string | null
}
export interface BaseSession {
  user: SessionUser
}

export interface CreateDalOptions<S extends BaseSession> {
  /** The app's NextAuth `auth()` accessor. */
  auth: () => Promise<S | null>
  /** Roles allowed through verifyAdmin / treated as privileged. */
  adminRoles: string[]
}

/** Redaction marker for PII shown to non-privileged roles (M3). */
export const REDACTED = "•••" as const

export function isPrivileged(role: string | null | undefined, adminRoles: string[]): boolean {
  return adminRoles.includes(role ?? "")
}

/** Non-tenant guards (BMS back-office, APP consumer). */
export function createDal<S extends BaseSession>(opts: CreateDalOptions<S>) {
  const verifySession = cache(async (): Promise<S> => {
    const session = await opts.auth()
    if (!session?.user) redirect("/sign-in")
    return session
  })

  const verifyAdmin = cache(async (): Promise<S> => {
    const session = await verifySession()
    if (!opts.adminRoles.includes(session.user.role ?? "")) forbidden()
    return session
  })

  const canViewSensitive = async (): Promise<boolean> => {
    const session = await verifySession()
    return opts.adminRoles.includes(session.user.role ?? "")
  }

  // Régua vocabulary, additive: requireSession aliases verifySession; requireRole
  // generalizes verifyAdmin to an arbitrary role set (403 via forbidden()).
  const requireSession = verifySession
  const requireRole = async (...roles: string[]): Promise<S> => {
    const session = await verifySession()
    if (!roles.includes(session.user.role ?? "")) forbidden()
    return session
  }

  return { verifySession, verifyAdmin, canViewSensitive, REDACTED, requireSession, requireRole }
}

/**
 * Tenant-scoped guards (SEQ). verifyTenantSession and verifyAdmin both require a
 * tenant and return it at the top level (`session.customerId`), matching the
 * existing call sites.
 */
export function createTenantDal<S extends BaseSession>(opts: CreateDalOptions<S>) {
  const verifySession = cache(async (): Promise<S> => {
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

  const verifyAdmin = cache(async () => {
    const session = await verifyTenantSession()
    if (!opts.adminRoles.includes(session.user.role ?? "")) forbidden()
    return session
  })

  const canViewSensitive = async (): Promise<boolean> => {
    const session = await verifySession()
    return opts.adminRoles.includes(session.user.role ?? "")
  }

  // Régua vocabulary, additive (tenant-scoped: requireRole resolves the tenant too).
  const requireSession = verifySession
  const requireRole = async (...roles: string[]) => {
    const session = await verifyTenantSession()
    if (!roles.includes(session.user.role ?? "")) forbidden()
    return session
  }

  return { verifySession, verifyTenantSession, verifyAdmin, canViewSensitive, REDACTED, requireSession, requireRole }
}
