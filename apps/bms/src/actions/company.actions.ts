'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { verifyAdmin } from '@/lib/dal'
import { companySchema, type CompanyFormValues } from '@/schemas/company.schema'

type ActionError = { error: string }

function buildAddressWrite(address: CompanyFormValues['address']) {
  if (!address) return undefined
  const hasData = Object.entries(address).some(([k, v]) => k !== 'country' && v)
  if (!hasData && !address.country) return undefined
  return { upsert: { create: address, update: address } }
}

export async function updateCompany(id: string, data: CompanyFormValues): Promise<ActionError | void> {
  await verifyAdmin()

  const validated = companySchema.safeParse(data)
  if (!validated.success) return { error: 'Invalid data' }

  const { address, ...rest } = validated.data

  await prisma.company.update({
    where: { id },
    data: {
      ...rest,
      address: buildAddressWrite(address),
    },
  })

  revalidatePath('/company')
}
