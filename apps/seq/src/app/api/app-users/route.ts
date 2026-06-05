import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyTenantSession } from '@/lib/dal'

export async function GET(req: NextRequest) {
  const { customerId } = await verifyTenantSession()

  const q = req.nextUrl.searchParams.get('q') ?? ''

  const results = await prisma.appUser.findMany({
    where: {
      tenantId: customerId,
      OR: [
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName:  { contains: q, mode: 'insensitive' } },
        { email:     { contains: q, mode: 'insensitive' } },
      ],
    },
    select: { id: true, firstName: true, lastName: true, email: true },
    orderBy: { firstName: 'asc' },
    take: 10,
  })

  return NextResponse.json(results)
}
