'use server'

import { randomBytes } from 'crypto'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { verifyTenantSession } from '@/lib/dal'
import { sendAppWelcomeEmail } from '@/lib/email'

type ActionError   = { error: string }
type ActionSuccess = { success: string }

export async function createAppSale(
  appUserId: string,
  licenseId: string,
  value: number,
): Promise<ActionError | ActionSuccess> {
  const { customerId, user } = await verifyTenantSession()

  // Verifica que o APP_USER pertence ao tenant
  const appUser = await prisma.appUser.findUnique({
    where:  { id: appUserId, tenantId: customerId },
    select: { id: true },
  })
  if (!appUser) return { error: 'Cliente não encontrado.' }

  // Verifica que há licença disponível
  const cl = await prisma.customerLicense.findUnique({
    where:  { customerId_licenseId: { customerId, licenseId } },
    select: { quantity: true },
  })
  if (!cl || cl.quantity < 1) return { error: 'Sem licenças disponíveis para este tipo.' }

  // Obtém o User vinculado ao APP_USER para criar o token
  const authUser = await prisma.user.findFirst({
    where:  { appUser: { id: appUserId } },
    select: { id: true, email: true },
  })
  if (!authUser) return { error: 'Usuário de acesso não encontrado para este cliente.' }

  const token = randomBytes(32).toString('hex')

  await prisma.$transaction(async (tx) => {
    await tx.customerLicense.update({
      where: { customerId_licenseId: { customerId, licenseId } },
      data:  { quantity: { decrement: 1 } },
    })

    await tx.appSale.create({
      data: {
        appUserId,
        licenseId,
        value,
        tenantId: customerId,
        soldById: user.id,
      },
    })

    await tx.passwordResetToken.create({
      data: {
        token,
        userId:    authUser.id,
        expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
      },
    })
  })

  await sendAppWelcomeEmail(authUser.email, token)

  revalidatePath('/sales')
  revalidatePath('/inventory/licenses')
  return { success: 'Venda registrada e acesso enviado com sucesso.' }
}
