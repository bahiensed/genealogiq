"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { verifySession } from "@/lib/dal"
import { memorialSchema } from "@/schemas/memorial"

export async function activatePhysicalQr(genCode: string, data: unknown) {
  const session = await verifySession()

  const license = await prisma.physicalQrLicense.findUnique({
    where: { genCode },
    select: { id: true, status: true },
  })
  if (!license)                       return { error: "QR code not found." }
  if (license.status !== "AVAILABLE") return { error: "This code has already been activated." }

  const parsed = memorialSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { firstName, lastName, gender, birthDate, birthPlace, birthCountry, deathDate, deathPlace, deathCountry, avatarUrl } = parsed.data

  try {
    const memorial = await prisma.$transaction(async (tx) => {
      const memo = await tx.appUser.create({
        data: {
          firstName,
          lastName,
          gender:       gender ?? null,
          role:         "APP_MEMO",
          birthDate,
          birthPlace,
          birthCountry,
          deathDate,
          deathPlace,
          deathCountry,
          avatarUrl,
        },
      })
      await tx.appUserGuardian.create({
        data: { appUserId: memo.id, guardianId: session.user.id },
      })
      await tx.physicalQrLicense.update({
        where: { id: license.id },
        data:  { status: "ACTIVATED", appUserId: memo.id, activatedAt: new Date() },
      })
      return memo
    })

    revalidatePath(`/profile/${session.user.id}/memorialized`)
    return { success: true, id: memorial.id }
  } catch (err: unknown) {
    // P2002 on physicalQrLicense.appUserId unique — race condition
    if (err && typeof err === "object" && "code" in err && err.code === "P2002") {
      return { error: "This code was just activated. Please try again." }
    }
    throw err
  }
}
