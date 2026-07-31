"use server"

import { revalidatePath } from "next/cache"
import { getTranslations } from "next-intl/server"
import { ok, done, fail, type ActionResult } from "@genealogiq/core"
import { prisma } from "@/lib/prisma"
import { verifySession } from "@/lib/dal"
import { getPetSchema, getPetEditSchema } from "@/schemas/pet.schema"
import { identityTranslator } from "@/schemas/i18n"
import { getProfileById, getProfileForEdit } from "@/queries/profile"
import { canManageProfile } from "@/lib/profile"
import { deleteBlobs } from "@/lib/blob"
import { getPetCreationStatus } from "@/lib/pet-quota"
import { getTreeMemberIds } from "@/queries/family-tree"

export async function createPet(data: unknown): Promise<ActionResult<{ id: string }>> {
  const t = await getTranslations("Actions")
  const session = await verifySession()

  const creationStatus = await getPetCreationStatus(session.user.id)
  if (!creationStatus.allowed) {
    return fail(t("pet.limitReached", { max: creationStatus.limit }))
  }

  const parsed = getPetSchema(identityTranslator).safeParse(data)
  if (!parsed.success) return fail(t("common.invalidData"))

  const { firstName, species, breed, gender, birthDate, deathDate, avatarUrl, ownerIds } = parsed.data

  // IDOR guard: every proposed owner must already be a member of the
  // creator's own tree — mirrors the anchorId check in addGhostRelative.
  const memberIds = await getTreeMemberIds(session.user.id)
  const uniqueOwnerIds = Array.from(new Set(ownerIds))
  if (uniqueOwnerIds.some((id) => !memberIds.has(id))) {
    return fail(t("pet.ownerNotInTree"))
  }

  const pet = await prisma.$transaction(async (tx) => {
    const created = await tx.appUser.create({
      data: {
        firstName,
        lastName: "",
        role: "APP_PET",
        petSpecies: species || null,
        petBreed: breed || null,
        gender: gender ?? null,
        birthDate,
        deathDate,
        avatarUrl,
      },
    })

    await tx.appUserGuardian.create({
      data: { appUserId: created.id, guardianId: session.user.id },
    })

    await tx.familyRelation.createMany({
      data: uniqueOwnerIds.map((ownerId) => ({
        type: "PET_OF",
        fromId: created.id,
        toId: ownerId,
        status: "ACCEPTED",
      })),
    })

    return created
  })

  revalidatePath(`/profile/${session.user.id}/pets`)
  return ok({ id: pet.id })
}

export async function updatePet(profileId: string, data: unknown): Promise<ActionResult> {
  const t = await getTranslations("Actions")
  const session = await verifySession()

  const profile = await getProfileForEdit(profileId)
  if (!profile || profile.role !== "APP_PET") return fail(t("pet.notFound"))
  if (!canManageProfile(profile, session.user.id)) return fail(t("pet.notAuthorized"))

  const parsed = getPetEditSchema(identityTranslator).safeParse(data)
  if (!parsed.success) return fail(t("common.invalidData"))

  const { firstName, species, breed, gender, birthDate, deathDate, avatarUrl } = parsed.data

  if (profile.avatarUrl && profile.avatarUrl !== avatarUrl) {
    await deleteBlobs([profile.avatarUrl])
  }

  await prisma.appUser.update({
    where: { id: profileId },
    data: {
      firstName,
      petSpecies: species || null,
      petBreed: breed || null,
      gender: gender ?? null,
      birthDate: birthDate ?? null,
      deathDate: deathDate ?? null,
      avatarUrl: avatarUrl ?? null,
    },
  })

  revalidatePath(`/profile/${profileId}`)
  return done()
}

export async function deletePet(profileId: string): Promise<ActionResult> {
  const t = await getTranslations("Actions")
  const session = await verifySession()

  const profile = await getProfileById(profileId)
  if (!profile || profile.role !== "APP_PET") return fail(t("pet.notFound"))
  if (!canManageProfile(profile, session.user.id)) return fail(t("pet.notAuthorized"))

  const [bio, galleryItems, documents, places] = await Promise.all([
    prisma.bio.findUnique({
      where: { userId: profileId },
      include: { images: { select: { url: true } } },
    }),
    prisma.galleryItem.findMany({ where: { userId: profileId }, select: { url: true } }),
    prisma.document.findMany({ where: { userId: profileId }, select: { fileUrl: true } }),
    prisma.geoPlace.findMany({ where: { userId: profileId }, select: { photos: true } }),
  ])

  await deleteBlobs([
    profile.avatarUrl,
    ...(bio?.images.map((i) => i.url) ?? []),
    ...galleryItems.map((i) => i.url),
    ...documents.map((d) => d.fileUrl),
    ...places.flatMap((p) => p.photos),
  ])

  await prisma.appUser.delete({ where: { id: profileId } })
  revalidatePath(`/profile/${session.user.id}/pets`)
  return done()
}
