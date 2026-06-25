import { z } from 'zod'
import { addressSchema, addressDefaultValues } from './address.schema'
import { validateCpf } from '@/lib/masks'
import type { Translator } from './i18n'

export const ASSIGNABLE_ROLES = ['OWNER', 'ADMIN', 'COMERCIAL', 'FINANCE', 'USER'] as const

function makeNationalIdRefine(t: Translator) {
  return (data: { nationalId?: string | null }, ctx: z.RefinementCtx) => {
    if (data.nationalId && !validateCpf(data.nationalId)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: t('invalidCpf'), path: ['nationalId'] })
    }
  }
}

export function getUserSchema(t: Translator) {
  return z.object({
    firstName:        z.string().min(2, t('minChars', { count: 2 })),
    lastName:         z.string().min(2, t('minChars', { count: 2 })),
    email:            z.string().email(t('invalidEmail')),
    role:             z.enum(ASSIGNABLE_ROLES, { error: t('invalidRole') }),
    gender:           z.string().nullish(),
    nationalId:       z.string().nullish(),
    birthDate:        z.string().nullish(),
    phoneCountryCode: z.string().min(1, t('countryCodeRequired')),
    phone:            z.string().nullish(),
    isActive:         z.boolean(),
    address:          addressSchema.optional(),
  }).superRefine(makeNationalIdRefine(t))
}

export type UserFormValues = z.infer<ReturnType<typeof getUserSchema>>

export const userDefaultValues: UserFormValues = {
  firstName:        '',
  lastName:         '',
  email:            '',
  role:             'USER',
  gender:           '',
  nationalId:       '',
  birthDate:        '',
  phoneCountryCode: '55',
  phone:            '',
  isActive:         true,
  address:          addressDefaultValues,
}
