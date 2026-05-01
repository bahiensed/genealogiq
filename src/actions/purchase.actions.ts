'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { verifyTenantSession } from '@/lib/dal'

type ActionResult = { error: string } | { success: string }

export async function purchasePackage(
  packageId: string,
  quantity: number,
): Promise<ActionResult> {
  const session = await verifyTenantSession()
  const { customerId } = session
  const userId = session.user.id

  if (!userId) return { error: 'User not identified.' }
  if (!Number.isInteger(quantity) || quantity < 1) return { error: 'Invalid quantity.' }

  const pkg = await prisma.package.findUnique({
    where:  { id: packageId, isActive: true },
    select: { quantity: true },
  })
  if (!pkg) return { error: 'Package not found or unavailable.' }

  const totalQRCodes = pkg.quantity * quantity

  await prisma.$transaction(async (tx) => {
    await tx.sale.create({
      data: {
        packageId,
        tenantId: customerId,
        quantity,
        soldById: userId,
      },
    })

    await tx.qrInventory.upsert({
      where:  { tenantId: customerId },
      create: { tenantId: customerId, quantity: totalQRCodes },
      update: { quantity: { increment: totalQRCodes } },
    })
  })

  revalidatePath('/purchasing/packages')
  revalidatePath('/inventory/packages')

  const label = totalQRCodes === 1 ? 'QR code added' : 'QR codes added'
  return { success: `Purchase complete! ${totalQRCodes} ${label} to your inventory.` }
}
