import { createAuth, googleCredentialsFromEnv } from "@genealogiq/auth"
import type { Profile } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authConfig } from "@/auth.config"

function syncGoogleLink(row: { id: string; emailVerified: Date | null }, profile: Profile) {
  return prisma.user.update({
    where: { id: row.id },
    data: {
      googleId: profile.sub,
      ...(row.emailVerified ? {} : { emailVerified: new Date() }),
    },
  })
}

// Resolved once at module scope — see googleCredentialsFromEnv's own comment
// in packages/auth/src/node.ts for why this can't be called inline below.
const googleCreds = googleCredentialsFromEnv()

export const { handlers, auth, signIn, signOut } = createAuth({
  edgeConfig: authConfig,
  loadUserByEmail: (email) => prisma.user.findUnique({ where: { email } }),
  resetLockout: (id) =>
    prisma.user.update({ where: { id }, data: { failedLoginAttempts: 0, lockedUntil: null } }),
  // BMS-only operators (no tenant) cannot log in to Sequoia. Applies
  // identically on the Google path — resolveGoogleSignIn reads this same
  // extraGate from the shared opts object.
  extraGate: (u) => !!u.tenantId,
  toPrincipal: (u) => ({
    id:         u.id,
    email:      u.email,
    name:       `${u.firstName} ${u.lastName}`,
    role:       u.role,
    customerId: u.tenantId ?? undefined,
    image:      u.avatarUrl,
  }),
  google: googleCreds && {
    ...googleCreds,
    // No createUserFromGoogleProfile — internal staff portal, invite-only.
    // An unmatched email is simply rejected, never auto-registered as staff.
    allowSelfSignup: false,
    syncGoogleLink,
  },
})
