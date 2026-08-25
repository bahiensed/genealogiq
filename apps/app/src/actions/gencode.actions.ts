"use server"

import { revalidatePath } from "next/cache"
import { getTranslations } from "next-intl/server"
import { ok, fail, isSaleWindowOpen, type ActionResult } from "@genealogiq/core"
import { prisma } from "@/lib/prisma"
import { verifySession } from "@/lib/dal"
import { getMemorialSchema } from "@/schemas/memorial.schema"
import { identityTranslator } from "@/schemas/i18n"

// Deliberately does NOT check getMemorialCreationStatus/memorialsMax — a
// redeemed physical QR license is itself a standalone purchase, independent
// of the guardian's own plan's memorial quota. Gating this against
// memorialsMax would mean charging for the same slot twice.
export async function activateGenCode(
  genCode: string,
  data: unknown,
): Promise<ActionResult<{ id: string }>> {
  const t = await getTranslations("Actions")
  const session = await verifySession()

  const license = await prisma.genCode.findUnique({
    where: { genCode },
    select: {
      id: true, status: true,
      sale: { select: { paidAt: true, reversedAt: true, status: true, accessEndsAt: true } },
    },
  })
  if (!license)                       return fail(t("gencode.notFound"))
  // A code can be activated whether it's still in stock (AVAILABLE) or already
  // sold/written-off (SOLD) — only an already-ACTIVATED code is rejected.
  if (license.status === "ACTIVATED") return fail(t("gencode.alreadyActivated"))
  // The batch this code came from has a term, and may be frozen while the
  // funeral home is behind on an instalment. This gates ACTIVATION only —
  // a memorial that already redeemed a code is never revisited, because the
  // family bought a physical plaque and it must not go dark over someone
  // else's billing.
  if (!isSaleWindowOpen(license.sale)) return fail(t("gencode.expired"))

  const parsed = getMemorialSchema(identityTranslator).safeParse(data)
  if (!parsed.success) return fail(parsed.error.issues[0].message)

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
      await tx.genCode.update({
        where: { id: license.id },
        data:  { status: "ACTIVATED", appUserId: memo.id, activatedAt: new Date() },
      })
      return memo
    })

    revalidatePath(`/profile/${session.user.id}/memorialized`)
    return ok({ id: memorial.id })
  } catch (err: unknown) {
    // P2002 on genCode.appUserId unique — race condition
    if (err && typeof err === "object" && "code" in err && err.code === "P2002") {
      return fail(t("gencode.raceRetry"))
    }
    throw err
  }
}
