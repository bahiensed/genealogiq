import 'server-only'

import { prisma } from '@/lib/prisma'

export async function getLicenseByGenCode(genCode: string) {
  return prisma.physicalQrLicense.findUnique({
    where: { genCode },
    select: {
      id:        true,
      genCode:   true,
      status:    true,
      appUserId: true,
    },
  })
}
