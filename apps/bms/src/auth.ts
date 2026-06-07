import { createAuth } from "@genealogiq/auth"
import { prisma } from "@/lib/prisma"
import { authConfig } from "@/auth.config"

export const { handlers, auth, signIn, signOut } = createAuth({
  edgeConfig: authConfig,
  loadUserByEmail: (email) => prisma.user.findUnique({ where: { email } }),
  resetLockout: (id) =>
    prisma.user.update({ where: { id }, data: { failedLoginAttempts: 0, lockedUntil: null } }),
  toPrincipal: (u) => ({
    id:    u.id,
    email: u.email,
    name:  `${u.firstName} ${u.lastName}`,
    role:  u.role,
    image: u.avatarUrl,
  }),
})
