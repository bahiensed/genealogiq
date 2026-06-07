import type { DefaultSession } from "next-auth"

// Canonical session augmentation — identical across all three apps.
declare module "next-auth" {
  interface User {
    role?: string
    customerId?: string | null
    image?: string | null
  }
  interface Session {
    user: DefaultSession["user"] & {
      id: string
      role: string
      customerId?: string
      image?: string | null
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    role?: string
    customerId?: string | null
    image?: string | null
  }
}
