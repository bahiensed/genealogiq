'use server'

import { revalidatePath } from 'next/cache'
import { getTranslations } from 'next-intl/server'
import { done, fail, type ActionResult } from '@genealogiq/core'
import { prisma } from '@/lib/prisma'
import { verifyTenantSession } from '@/lib/dal'

export async function markQrPrinted(appUserId: string): Promise<ActionResult> {
  const t = await getTranslations('Actions')
  const { customerId } = await verifyTenantSession()

  const memorial = await prisma.appUser.findUnique({
    where:  { id: appUserId, tenantId: customerId },
    select: { id: true },
  })
  if (!memorial) return fail(t('qrCode.notFound'))

  await prisma.qrCode.update({
    where: { appUserId },
    data:  { status: 'PRINTED', printedAt: new Date() },
  })

  revalidatePath(`/memorialized/${appUserId}`)
  return done()
}

export async function markQrInstalled(appUserId: string): Promise<ActionResult> {
  const t = await getTranslations('Actions')
  const { customerId } = await verifyTenantSession()

  const memorial = await prisma.appUser.findUnique({
    where:  { id: appUserId, tenantId: customerId },
    select: { id: true },
  })
  if (!memorial) return fail(t('qrCode.notFound'))

  await prisma.qrCode.update({
    where: { appUserId },
    data:  { status: 'INSTALLED', installedAt: new Date() },
  })

  revalidatePath(`/memorialized/${appUserId}`)
  return done()
}
