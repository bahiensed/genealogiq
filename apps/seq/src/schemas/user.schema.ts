import { z } from 'zod'
import { addressSchema, addressDefaultValues } from './address.schema'
import type { Translator } from './i18n'

export const ASSIGNABLE_ROLES = ['OWNER', 'ADMIN', 'COMERCIAL', 'FINANCE', 'USER'] as const

export function getUserSchema(t: Translator) {
  return z.object({
    firstName:        z.string().min(2, t('minChars', { count: 2 })),
    lastName:         z.string().min(2, t('minChars', { count: 2 })),
    email:            z.string().email(t('invalidEmail')),
    role:             z.enum(ASSIGNABLE_ROLES, { error: t('invalidRole') }),
    nationalId:       z.string().nullish(),
    birthDate:        z.string().nullish(),
    phoneCountryCode: z.string().min(1, t('countryCodeRequired')),
    phone:            z.string().nullish(),
    isActive:         z.boolean(),
    address:          addressSchema.optional(),
  })
}

export type UserFormValues = z.infer<ReturnType<typeof getUserSchema>>

export const userDefaultValues: UserFormValues = {
  firstName:        '',
  lastName:         '',
  email:            '',
  role:             'USER',
  nationalId:       '',
  birthDate:        '',
  phoneCountryCode: '55',
  phone:            '',
  isActive:         true,
  address:          addressDefaultValues,
}
