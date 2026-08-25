import 'server-only'

import { prisma } from '@/lib/prisma'

export async function getLicenseByGenCode(genCode: string) {
  return prisma.genCode.findUnique({
    where: { genCode },
    select: {
      id:        true,
      genCode:   true,
      status:    true,
      appUserId: true,
      sale: {
        select: { paidAt: true, reversedAt: true, status: true, accessEndsAt: true },
      },
    },
  })
}
