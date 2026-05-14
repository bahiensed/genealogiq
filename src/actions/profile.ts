"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { verifySession } from "@/lib/dal"
import { profileEditSchema } from "@/schemas/profile"
import { deleteBlobs } from "@/lib/blob"

export async function updateProfile(data: unknown) {
  const session = await verifySession()

  const parsed = profileEditSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const {
    firstName, lastName, maidenName, nickname, gender, nationalId, avatarUrl,
    birthDate, birthPlace, birthState, birthCountry,
    phoneCountryCode, phone,
    website, instagram, linkedin, fb, x, tiktok, youtube, otherSocial,
    notes,
    address,
  } = parsed.data

  const current = await prisma.appUser.findUnique({
    where: { id: session.user.id },
    select: { avatarUrl: true, addressId: true },
  })

  if (current?.avatarUrl && current.avatarUrl !== avatarUrl) {
    await deleteBlobs([current.avatarUrl])
  }

  const addressId = await upsertAddress(current?.addressId ?? null, address)

  await prisma.appUser.update({
    where: { id: session.user.id },
    data: {
      firstName, lastName,
      maidenName:       maidenName       || null,
      nickname:         nickname         || null,
      gender:           gender           ?? null,
      nationalId:       nationalId       || null,
      avatarUrl:        avatarUrl        ?? null,
      birthDate:        birthDate        ?? null,
      birthPlace:       birthPlace       || null,
      birthState:       birthState       || null,
      birthCountry:     birthCountry     || null,
      phoneCountryCode: phoneCountryCode || "55",
      phone:            phone            || null,
      website:          website          || null,
      instagram:        instagram        || null,
      linkedin:         linkedin         || null,
      fb:               fb               || null,
      x:                x                || null,
      tiktok:           tiktok           || null,
      youtube:          youtube          || null,
      otherSocial:      otherSocial      || null,
      notes:            notes            || null,
      addressId,
    },
  })

  revalidatePath(`/profile/${session.user.id}`)
  revalidatePath("/", "layout")
  return { success: true }
}

async function upsertAddress(
  existingId: string | null,
  data: Record<string, string | null | undefined>,
): Promise<string | null> {
  const hasData = Object.entries(data).some(
    ([k, v]) => k !== "country" && typeof v === "string" && v.trim(),
  )

  if (!hasData) {
    if (existingId) {
      await prisma.address.delete({ where: { id: existingId } }).catch(() => {})
    }
    return null
  }

  if (existingId) {
    await prisma.address.update({ where: { id: existingId }, data })
    return existingId
  }

  const created = await prisma.address.create({ data })
  return created.id
}
