'use server'

import { revalidatePath } from 'next/cache'
import { getTranslations } from 'next-intl/server'
import { prisma } from '@/lib/prisma'
import { done, fail, type ActionResult } from '@genealogiq/core'
import { verifyAdmin } from '@/lib/dal'
import { getCompanySchema, type CompanyFormValues } from '@/schemas/company.schema'
import { identityTranslator } from '@/schemas/i18n'

function buildAddressWrite(address: CompanyFormValues['address']) {
  if (!address) return undefined
  const hasData = Object.entries(address).some(([k, v]) => k !== 'country' && v)
  if (!hasData && !address.country) return undefined
  return { upsert: { create: address, update: address } }
}

export async function updateCompany(id: string, data: CompanyFormValues): Promise<ActionResult> {
  await verifyAdmin()
  const t = await getTranslations('Actions')

  const validated = getCompanySchema(identityTranslator).safeParse(data)
  if (!validated.success) return fail(t('common.invalidData'))

  const { address, ...rest } = validated.data

  await prisma.company.update({
    where: { id },
    data: {
      ...rest,
      address: buildAddressWrite(address),
    },
  })

  revalidatePath('/system/company')
  return done()
}
