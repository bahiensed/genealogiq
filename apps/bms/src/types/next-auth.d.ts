import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface User {
    role?: string
    image?: string | null
  }
  interface Session {
    user: DefaultSession["user"] & {
      id: string
      role: string
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    role?: string
    image?: string | null
  }
}
