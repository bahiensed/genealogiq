'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { verifyTenantSession } from '@/lib/dal'
import { companySchema, type CompanyFormValues } from '@/schemas/company.schema'

type ActionError = { error: string }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildAddressWrite(address: CompanyFormValues['address']): any {
  if (!address) return undefined
  const hasData = Object.entries(address).some(([k, v]) => k !== 'country' && v)
  if (!hasData && !address.country) return undefined
  return { upsert: { create: address, update: address } }
}

export async function updateCompany(_id: string, data: CompanyFormValues): Promise<ActionError | void> {
  const { customerId } = await verifyTenantSession()

  const validated = companySchema.safeParse(data)
  if (!validated.success) return { error: 'Invalid data' }

  const { address, legalName, ...rest } = validated.data

  await prisma.customer.update({
    where: { id: customerId },
    data: {
      name: legalName,
      ...rest,
      address: buildAddressWrite(address),
    },
  })

  revalidatePath('/company')
}
