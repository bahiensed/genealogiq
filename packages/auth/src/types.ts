// Canonical authenticated principal — one shape for all three apps. `customerId`
// is the tenant id and is populated only by SEQ (undefined elsewhere). This is the
// single source of truth that each app's `next-auth.d.ts` augments.
export interface AppPrincipal {
  id: string
  email: string
  name: string
  role: string
  image?: string | null
  customerId?: string
}

// Minimum fields the canonical `authorize` needs from whatever identity row the
// app loads (User or AppUser). The app's loadUserByEmail returns a row extending
// this, and maps it to an AppPrincipal via toPrincipal().
export interface AuthUserRow {
  id: string
  password: string | null
  isActive: boolean
  emailVerified: Date | null
  failedLoginAttempts: number
  lockedUntil: Date | null
}
