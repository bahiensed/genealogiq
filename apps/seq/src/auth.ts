import { createAuth } from "@genealogiq/auth"
import { prisma } from "@/lib/prisma"
import { authConfig } from "@/auth.config"

export const { handlers, auth, signIn, signOut } = createAuth({
  edgeConfig: authConfig,
  loadUserByEmail: (email) => prisma.user.findUnique({ where: { email } }),
  resetLockout: (id) =>
    prisma.user.update({ where: { id }, data: { failedLoginAttempts: 0, lockedUntil: null } }),
  // BMS-only operators (no tenant) cannot log in to Sequoia.
  extraGate: (u) => !!u.tenantId,
  toPrincipal: (u) => ({
    id:         u.id,
    email:      u.email,
    name:       `${u.firstName} ${u.lastName}`,
    role:       u.role,
    customerId: u.tenantId ?? undefined,
    image:      u.avatarUrl,
  }),
})
