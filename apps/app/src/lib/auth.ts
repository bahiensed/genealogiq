import { z } from "zod"

// Canonical auth schemas live in @genealogiq/auth. Re-exported so @/lib/auth imports keep working.
export * from "@genealogiq/auth/schemas"

// APP relaxes its password policy to min-8-no-composition (see
// src/schemas/auth.schema.ts's getSignUpSchema for the rationale) for every
// form where a user sets their OWN password — sign-up (already a local copy),
// and these two. Declared here as local overrides (shadowing the `export *`
// above, which wins for every other name) instead of editing the shared
// strongPassword in @genealogiq/auth/schemas, because that schema also backs
// BMS/SEQ's staff/admin setup wizards — those keep the stricter 8+composition
// rule untouched.
export const ResetPasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
})

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
})
