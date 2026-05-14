import { prisma } from "@/lib/prisma"

export async function getProfileById(id: string) {
  return prisma.appUser.findUnique({
    where: { id },
    select: {
      id: true,
      role: true,
      // Identity
      firstName: true,
      lastName: true,
      maidenName: true,
      nickname: true,
      gender: true,
      nationalId: true,
      avatarUrl: true,
      // Birth
      birthDate: true,
      birthPlace: true,
      birthState: true,
      birthCountry: true,
      // Death
      deathDate: true,
      deathPlace: true,
      deathState: true,
      deathCountry: true,
      deathCause: true,
      // Contact
      phone: true,
      phoneCountryCode: true,
      // Social
      website: true,
      instagram: true,
      linkedin: true,
      fb: true,
      x: true,
      tiktok: true,
      youtube: true,
      otherSocial: true,
      // Notes
      notes: true,
      // Address
      address: {
        select: {
          id: true,
          zip: true,
          street: true,
          number: true,
          complement: true,
          neighborhood: true,
          city: true,
          state: true,
          country: true,
        },
      },
      // Relations
      appSaleId: true,
      guardedBy: { select: { guardianId: true } },
    },
  })
}

export type ProfileRow = NonNullable<Awaited<ReturnType<typeof getProfileById>>>
