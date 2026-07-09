import { z } from "zod"
import type { Translator } from "./i18n"

// Mirrors @genealogiq/auth's SignUpSchema (same rules) but with localized
// messages for client-side (react-hook-form) validation in this app's sign-up
// form. The shared package's messages stay English-only by design (BMS/SEQ
// have no public sign-up); this local copy is what the APP form renders.
export function getSignUpSchema(tErr: Translator, tAuth: Translator) {
  return z.object({
    firstName: z.string().trim().min(2, tErr("minChars", { count: 2 })),
    lastName: z.string().trim().min(2, tErr("minChars", { count: 2 })),
    email: z.string().trim().email(tErr("invalidEmail")),
    password: z
      .string()
      .min(8, tAuth("passwordRuleLength"))
      .regex(/[A-Z]/, tAuth("passwordRuleUppercase"))
      .regex(/[a-z]/, tAuth("passwordRuleLowercase"))
      .regex(/[0-9]/, tAuth("passwordRuleNumber"))
      .regex(/[^a-zA-Z0-9]/, tAuth("passwordRuleSpecial")),
  })
}

export type SignUpFormValues = z.infer<ReturnType<typeof getSignUpSchema>>
