"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { verifySession } from "@/lib/dal"
import { bioSchema } from "@/schemas/bio"
import { getProfileById } from "@/queries/profile"
import { canManageProfile } from "@/lib/profile"
import { deleteBlobs } from "@/lib/blob"
import { getMemorialFeatures } from "@/lib/subscription"

export async function saveBio(profileId: string, data: unknown) {
  const session = await verifySession()

  const profile = await getProfileById(profileId)
  if (!profile) return { error: "Profile not found." }
  if (!canManageProfile(profile, session.user.id)) return { error: "Not authorized." }

  const parsed = bioSchema.safeParse(data)
  if (!parsed.success) return { error: "Invalid data" }

  const { quote, text, images } = parsed.data

  const features = await getMemorialFeatures(profileId)
  if ((text?.length ?? 0) > features.bioMaxChars) {
    return { error: `Biography limit is ${features.bioMaxChars} characters for this plan.` }
  }
  if (images.length > features.bioMaxImages) {
    return { error: `Image limit is ${features.bioMaxImages} for this plan.` }
  }

  const bio = await prisma.bio.upsert({
    where: { userId: profileId },
    create: { userId: profileId, quote, text },
    update: { quote, text },
  })

  const oldImages = await prisma.bioImage.findMany({ where: { bioId: bio.id }, select: { url: true } })
  const newUrls = new Set(images.map((i) => i.url))
  await deleteBlobs(oldImages.map((i) => i.url).filter((u) => !newUrls.has(u)))

  await prisma.bioImage.deleteMany({ where: { bioId: bio.id } })

  if (images.length > 0) {
    await prisma.bioImage.createMany({
      data: images.map((img, i) => ({
        id: img.id,
        url: img.url,
        aspect: img.aspect ?? "square",
        order: i,
        bioId: bio.id,
      })),
    })
  }

  revalidatePath(`/profile/${profileId}/bio`)
  return { success: true }
}

export async function deleteBio(profileId: string) {
  const session = await verifySession()

  const profile = await getProfileById(profileId)
  if (!profile) return { error: "Profile not found." }
  if (!canManageProfile(profile, session.user.id)) return { error: "Not authorized." }

  const bio = await prisma.bio.findUnique({
    where: { userId: profileId },
    include: { images: { select: { url: true } } },
  })
  await deleteBlobs(bio?.images.map((i) => i.url) ?? [])

  await prisma.bio.deleteMany({ where: { userId: profileId } })
  revalidatePath(`/profile/${profileId}/bio`)
  return { success: true }
}
