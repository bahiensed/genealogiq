import "server-only"

import { auth } from "@/auth"
import { createDal } from "@genealogiq/auth/dal"

export const { verifySession, verifyAdmin, canViewSensitive, REDACTED } = createDal({
  auth: () => auth(),
  adminRoles: ["SUPER_ADMIN", "OWNER", "ADMIN"],
})
