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
    select: { quantity: true, licenseId: true },
  })
  if (!pkg) return { error: 'Package not found or unavailable.' }

  const totalLicenses = pkg.quantity * quantity

  await prisma.$transaction(async (tx) => {
    await tx.sale.create({
      data: {
        packageId,
        customerId,
        quantity,
        soldAt:   new Date(),
        soldById: userId,
      },
    })

    await tx.customerLicense.upsert({
      where:  { customerId_licenseId: { customerId, licenseId: pkg.licenseId } },
      create: { customerId, licenseId: pkg.licenseId, quantity: totalLicenses },
      update: { quantity: { increment: totalLicenses } },
    })
  })

  revalidatePath('/purchasing/licenses')
  revalidatePath('/inventory/licenses')

  const label = totalLicenses === 1 ? 'license added' : 'licenses added'
  return { success: `Purchase complete! ${totalLicenses} ${label} to your inventory.` }
}
