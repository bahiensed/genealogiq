import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { addressSchema, addressDefaultValues } from './address.schema'
import { validateCpf } from '@/lib/masks'

export const ASSIGNABLE_ROLES = ['OWNER', 'ADMIN', 'COMERCIAL', 'FINANCE', 'USER'] as const

export const userSchema = z.object({
  firstName:        z.string().min(2, 'Must be at least 2 characters'),
  lastName:         z.string().min(2, 'Must be at least 2 characters'),
  email:            z.string().email('Invalid email address'),
  role:             z.enum(ASSIGNABLE_ROLES, { error: 'Invalid role' }),
  gender:           z.string().nullish(),
  nationalId:       z.string().nullish(),
  birthDate:        z.string().nullish(),
  phoneCountryCode: z.string().min(1, 'Country code is required'),
  phone:            z.string().nullish(),
  isActive:         z.boolean(),
  address:          addressSchema.optional(),
}).superRefine((data, ctx) => {
  if (data.nationalId && !validateCpf(data.nationalId)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid CPF', path: ['nationalId'] })
  }
})

export type UserFormValues = z.infer<typeof userSchema>

export const userResolver = zodResolver(userSchema)

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
