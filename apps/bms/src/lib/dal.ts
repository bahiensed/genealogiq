import "server-only"

import { cache } from "react"
import { redirect, forbidden } from "next/navigation"
import { auth } from "@/auth"

export const verifySession = cache(async () => {
  const session = await auth()
  if (!session?.user) redirect("/sign-in")
  return session
})

const ADMIN_ROLES = ["SUPER_ADMIN", "OWNER", "ADMIN"]

export const verifyAdmin = cache(async () => {
  const session = await verifySession()
  if (!ADMIN_ROLES.includes(session.user?.role ?? "")) forbidden()
  return session
})
