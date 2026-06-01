'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { verifyTenantSession } from '@/lib/dal'

type ActionError = { error: string }

export async function markQrPrinted(appUserId: string): Promise<ActionError | void> {
  const { customerId } = await verifyTenantSession()

  const memorial = await prisma.appUser.findUnique({
    where:  { id: appUserId, tenantId: customerId },
    select: { id: true },
  })
  if (!memorial) return { error: 'Profile not found.' }

  await prisma.qrCode.update({
    where: { appUserId },
    data:  { status: 'PRINTED', printedAt: new Date() },
  })

  revalidatePath(`/memorialized/${appUserId}`)
}

export async function markQrInstalled(appUserId: string): Promise<ActionError | void> {
  const { customerId } = await verifyTenantSession()

  const memorial = await prisma.appUser.findUnique({
    where:  { id: appUserId, tenantId: customerId },
    select: { id: true },
  })
  if (!memorial) return { error: 'Profile not found.' }

  await prisma.qrCode.update({
    where: { appUserId },
    data:  { status: 'INSTALLED', installedAt: new Date() },
  })

  revalidatePath(`/memorialized/${appUserId}`)
}
