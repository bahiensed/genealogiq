'use server'

import { revalidatePath } from 'next/cache'
import { getTranslations } from 'next-intl/server'
import { done, fail, type ActionResult } from '@genealogiq/core'
import { prisma } from '@/lib/prisma'
import { verifyTenantSession } from '@/lib/dal'
import { getCompanySchema, type CompanyFormValues } from '@/schemas/company.schema'
import { identityTranslator } from '@/schemas/i18n'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildAddressWrite(address: CompanyFormValues['address']): any {
  if (!address) return undefined
  const hasData = Object.entries(address).some(([k, v]) => k !== 'country' && v)
  if (!hasData && !address.country) return undefined
  return { upsert: { create: address, update: address } }
}

export async function updateCompany(_id: string, data: CompanyFormValues): Promise<ActionResult> {
  const { customerId } = await verifyTenantSession()
  const t = await getTranslations('Actions')

  const validated = getCompanySchema(identityTranslator).safeParse(data)
  if (!validated.success) return fail(t('common.invalidData'))

  const { address, legalName, ...rest } = validated.data

  await prisma.tenant.update({
    where: { id: customerId },
    data: {
      name: legalName,
      ...rest,
      address: buildAddressWrite(address),
    },
  })

  revalidatePath('/system/company')

  return done(t('company.updated'))
}
