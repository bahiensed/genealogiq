"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { verifySession } from "@/lib/dal"

export async function toggleFavorite(targetId: string) {
  const session = await verifySession()
  if (session.user.id === targetId) return { error: "You cannot favorite your own profile." }

  const existing = await prisma.favorite.findUnique({
    where: { userId_targetId: { userId: session.user.id, targetId } },
    select: { userId: true },
  })

  if (existing) {
    await prisma.favorite.delete({
      where: { userId_targetId: { userId: session.user.id, targetId } },
    })
  } else {
    await prisma.favorite.create({
      data: { userId: session.user.id, targetId },
    })
  }

  revalidatePath(`/profile/${targetId}`)
  revalidatePath(`/profile/${session.user.id}/favorites`)
  return { success: true, favorited: !existing }
}
