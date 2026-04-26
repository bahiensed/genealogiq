import "server-only"

import { cache } from "react"
import { redirect, forbidden } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export const verifySession = cache(async () => {
  const session = await auth()
  if (!session?.user) redirect("/sign-in")
  return session
})

export const verifyTenantSession = cache(async () => {
  const session = await verifySession()
  const customerId = session.user.customerId
  if (!customerId) redirect("/sign-in")
  return { ...session, customerId }
})

export const getCustomerModules = cache(async () => {
  const session = await verifyTenantSession()
  return prisma.tenant.findUnique({
    where: { id: session.customerId },
    select: {
      moduleRecordsSuppliers:    true,
      moduleRecordsProducts:     true,
      moduleRecordsServices:     true,
      moduleCategoriesSuppliers: true,
      moduleCategoriesProducts:  true,
      moduleCategoriesServices:  true,
      modulePurchasingProducts:  true,
      modulePurchasingServices:  true,
      moduleInventoryProducts:   true,
      moduleFinance:             true,
    },
  })
})

const ADMIN_ROLES = ["SUPER_ADMIN", "OWNER", "ADMIN"]

export const verifyAdmin = cache(async () => {
  const session = await verifyTenantSession()
  if (!ADMIN_ROLES.includes(session.user?.role ?? "")) forbidden()
  return session
})
