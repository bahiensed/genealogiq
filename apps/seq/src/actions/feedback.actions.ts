"use server"

import { getTranslations } from "next-intl/server"
import { done, fail, type ActionResult } from "@genealogiq/core"
import { verifySession } from "@/lib/dal"
import { getFeedbackSchema } from "@/schemas/feedback.schema"
import { identityTranslator } from "@/schemas/i18n"
import { sendFeedback as sendFeedbackEmail } from "@/lib/email"

export async function sendFeedback(data: unknown): Promise<ActionResult> {
  const t = await getTranslations("Actions")
  const session = await verifySession()

  const parsed = getFeedbackSchema(identityTranslator).safeParse(data)
  if (!parsed.success) return fail(t("common.invalidData"))

  await sendFeedbackEmail({
    ...parsed.data,
    contactEmail: session.user.email ?? undefined,
  })
  return done()
}
