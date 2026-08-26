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
    // Only the two that still gate a real screen — the supplier pages, which
    // call forbidden() on these. The other eight columns survive on Tenant and
    // are still editable in BMS, but nothing in SEQ reads them any more, and
    // since the Cadastros group left the sidebar nothing gates a menu entry
    // either.
    select: {
      moduleRecordsSuppliers:    true,
      moduleCategoriesSuppliers: true,
    },
  })
})
