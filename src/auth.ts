import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { authConfig } from "@/auth.config"
import { SignInSchema } from "@/lib/auth"

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      authorize: async (credentials) => {
        const validated = SignInSchema.safeParse(credentials)
        if (!validated.success) return null

        const { email, password } = validated.data

        const user = await prisma.user.findUnique({ where: { email } })
        if (!user) return null

        if (user.emailVerified === null) return null
        if (!user.isActive) return null
        if (!user.password) return null

        if (user.lockedUntil && user.lockedUntil > new Date()) return null

        const match = await bcrypt.compare(password, user.password)
        if (!match) return null

        if (user.failedLoginAttempts > 0 || user.lockedUntil) {
          await prisma.user.update({
            where: { id: user.id },
            data: { failedLoginAttempts: 0, lockedUntil: null },
          })
        }

        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          role: user.role,
        }
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.name = user.name
        token.role = user.role
      }
      return token
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string
      if (token.role) session.user.role = token.role as string
      return session
    },
  },
})
