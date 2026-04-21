"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { verifySession } from "@/lib/dal"
import { bioSchema } from "@/schemas/bio"

export async function saveBio(data: unknown) {
  const session = await verifySession()
  const parsed = bioSchema.safeParse(data)
  if (!parsed.success) return { error: "Invalid data" }

  const { quote, text, images } = parsed.data

  const bio = await prisma.bio.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, quote, text },
    update: { quote, text },
  })

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

  revalidatePath("/profile/bio")
  return { success: true }
}

export async function deleteBio() {
  const session = await verifySession()
  await prisma.bio.deleteMany({ where: { userId: session.user.id } })
  revalidatePath("/profile/bio")
  return { success: true }
}
