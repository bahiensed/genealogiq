'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { verifySession } from '@/lib/dal'
import { profileSchema, type ProfileFormValues } from '@/schemas/profile.schema'

// Self-profile edit: any logged-in user can update their OWN profile. Scope is
// clamped to session.user.id, so role/email/isActive/tenantId stay untouched
// here — those go through dedicated flows (admin actions or the dialogs in
// components/auth/).

type ActionResult = { error: string } | { success: string }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildAddressWrite(address: ProfileFormValues['address']): any {
  if (!address) return undefined
  const hasData = Object.entries(address).some(([k, v]) => k !== 'country' && v)
  if (!hasData && !address.country) return undefined
  return { upsert: { create: address, update: address } }
}

export async function updateProfile(data: ProfileFormValues): Promise<ActionResult> {
  const session = await verifySession()

  const validated = profileSchema.safeParse(data)
  if (!validated.success) return { error: 'Invalid data' }

  const { address, birthDate, ...rest } = validated.data

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      ...rest,
      birthDate: birthDate ? new Date(birthDate) : null,
      address:   buildAddressWrite(address),
    },
  })

  revalidatePath('/profile')
  return { success: 'Profile updated successfully.' }
}
