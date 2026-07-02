import { z } from "zod"
import type { Translator } from "./i18n"

export function getFeedbackSchema(t: Translator) {
  return z.object({
    type: z.enum(["bug", "feedback"]),
    message: z.string().trim().min(1, t("required")).max(2000),
    page: z.string().trim().max(500).optional(),
  })
}

export type FeedbackValues = z.infer<ReturnType<typeof getFeedbackSchema>>
