"use server"

import { revalidatePath } from "next/cache"
import { getTranslations } from "next-intl/server"
import { done, fail, type ActionResult } from "@genealogiq/core"
import { prisma } from "@/lib/prisma"
import { verifySession } from "@/lib/dal"
import { getProfileEditSchema } from "@/schemas/profile.schema"
import { identityTranslator } from "@/schemas/i18n"
import { deleteBlobs } from "@/lib/blob"

export async function updateProfile(data: unknown): Promise<ActionResult> {
  const t = await getTranslations("Actions")
  const session = await verifySession()

  const parsed = getProfileEditSchema(identityTranslator, false).safeParse(data)
  if (!parsed.success) return fail(t("common.invalidData"))

  const {
    firstName, lastName, maidenName, nickname, gender, avatarUrl,
    birthDate, birthPlace, birthState, birthCountry,
    website, instagram, linkedin, fb, x, tiktok, youtube, otherSocial,
    notes,
  } = parsed.data

  const current = await prisma.appUser.findUnique({
    where: { id: session.user.id },
    select: { avatarUrl: true },
  })

  if (current?.avatarUrl && current.avatarUrl !== avatarUrl) {
    await deleteBlobs([current.avatarUrl])
  }

  // National ID / contact / address are no longer part of the form — leave those
  // columns untouched so any existing data is preserved.
  await prisma.appUser.update({
    where: { id: session.user.id },
    data: {
      firstName, lastName,
      maidenName:   maidenName   || null,
      nickname:     nickname     || null,
      gender:       gender       ?? null,
      avatarUrl:    avatarUrl    ?? null,
      birthDate:    birthDate    ?? null,
      birthPlace:   birthPlace   || null,
      birthState:   birthState   || null,
      birthCountry: birthCountry || null,
      website:      website      || null,
      instagram:    instagram    || null,
      linkedin:     linkedin     || null,
      fb:           fb           || null,
      x:            x            || null,
      tiktok:       tiktok       || null,
      youtube:      youtube      || null,
      otherSocial:  otherSocial  || null,
      notes:        notes        || null,
    },
  })

  revalidatePath(`/profile/${session.user.id}`)
  revalidatePath("/", "layout")
  return done()
}
