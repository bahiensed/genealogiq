import "server-only"

import { cache } from "react"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { createTenantDal } from "@genealogiq/auth/dal"

export const { verifySession, verifyTenantSession, verifyAdmin, canViewSensitive, REDACTED, requireSession, requireRole } =
  createTenantDal({
    auth: () => auth(),
    adminRoles: ["SUPER_ADMIN", "OWNER", "ADMIN"],
  })

// Sequoia-specific: the current tenant's enabled feature modules.
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
