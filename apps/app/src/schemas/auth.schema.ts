import { z } from "zod"
import type { Translator } from "./i18n"

// Local copy (not @genealogiq/auth's SignUpSchema) for two reasons: localized
// messages for client-side (react-hook-form) validation in this app's sign-up
// form — the shared package's messages stay English-only by design (BMS/SEQ
// have no public sign-up) — and a deliberately relaxed password rule (min 8,
// no composition requirements) for this consumer-facing form specifically.
// Composition rules (must have uppercase/number/special) push users toward
// predictable patterns without meaningfully raising real entropy, per current
// NIST 800-63B guidance — length is what actually matters. BMS/SEQ keep the
// stricter shared strongPassword (staff/admin accounts, different bar).
export function getSignUpSchema(tErr: Translator, tAuth: Translator) {
  return z.object({
    firstName: z.string().trim().min(2, tErr("minChars", { count: 2 })),
    lastName: z.string().trim().min(2, tErr("minChars", { count: 2 })),
    email: z.string().trim().email(tErr("invalidEmail")),
    password: z.string().min(8, tAuth("passwordRuleLength")),
  })
}

export type SignUpFormValues = z.infer<ReturnType<typeof getSignUpSchema>>
