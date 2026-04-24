"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { verifySession } from "@/lib/dal"
import { profileUpdateSchema } from "@/schemas/profile"
import { deleteBlobs } from "@/lib/blob"

export async function updateProfile(data: unknown) {
  const session = await verifySession()

  const parsed = profileUpdateSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { firstName, lastName, gender, birthDate, birthPlace, birthCountry, avatarUrl } = parsed.data

  const current = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { avatarUrl: true },
  })
  if (current?.avatarUrl && current.avatarUrl !== avatarUrl) {
    await deleteBlobs([current.avatarUrl])
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { firstName, lastName, gender: gender ?? null, birthDate, birthPlace, birthCountry, avatarUrl },
  })

  revalidatePath(`/profile/${session.user.id}`)
  revalidatePath("/", "layout")
  return { success: true }
}
