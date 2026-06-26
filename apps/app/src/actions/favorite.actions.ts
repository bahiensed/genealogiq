"use server"

import { revalidatePath } from "next/cache"
import { getTranslations } from "next-intl/server"
import { ok, fail, type ActionResult } from "@genealogiq/core"
import { prisma } from "@/lib/prisma"
import { verifySession } from "@/lib/dal"

export async function toggleFavorite(targetId: string): Promise<ActionResult<{ favorited: boolean }>> {
  const t = await getTranslations("Actions")
  const session = await verifySession()
  if (session.user.id === targetId) return fail(t("favorite.cannotFavoriteSelf"))

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
  return ok({ favorited: !existing })
}
