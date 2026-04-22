"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { verifySession } from "@/lib/dal"
import { profileUpdateSchema } from "@/schemas/profile"

export async function updateProfile(data: unknown) {
  const session = await verifySession()

  const parsed = profileUpdateSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { firstName, lastName, birthDate, birthPlace, birthCountry, avatarUrl } = parsed.data

  await prisma.user.update({
    where: { id: session.user.id },
    data: { firstName, lastName, birthDate, birthPlace, birthCountry, avatarUrl },
  })

  revalidatePath(`/profile/${session.user.id}`)
  return { success: true }
}
