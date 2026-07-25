import { createAuth } from "@genealogiq/auth"
import type { AppPrincipal } from "@genealogiq/auth/types"
import { prisma } from "@/lib/prisma"
import { authConfig } from "@/auth.config"

// Exported (not inline) so the verify-email auto-login route can map an
// AppUser row to the same principal shape a normal login produces, without
// duplicating this mapping.
export function toPrincipal(u: { id: string; email: string | null; firstName: string; lastName: string; role: string }): AppPrincipal {
  return {
    id:    u.id,
    email: u.email ?? "",
    name:  `${u.firstName} ${u.lastName}`,
    role:  u.role,
  }
}

export const { handlers, auth, signIn, signOut } = createAuth({
  edgeConfig: authConfig,
  loadUserByEmail: (email) => prisma.appUser.findFirst({ where: { email } }),
  resetLockout: (id) =>
    prisma.appUser.update({ where: { id }, data: { failedLoginAttempts: 0, lockedUntil: null } }),
  // Wrapped (not passed by reference) so `u`'s type is still inferred from
  // createAuth's generic context here, same as before this was extracted —
  // passing the standalone toPrincipal directly makes TS's generic inference
  // fall back to the narrower AuthUserRow constraint instead of the actual
  // AppUser row shape, which then rejects the call as missing fields.
  toPrincipal: (u) => toPrincipal(u),
})
