import { z } from "zod"

// Canonical auth form schemas — one definition for all three apps. Inputs are
// trimmed (the most correct behavior, previously only in APP). Messages are in
// English; per-locale messaging is a separate i18n concern.

const strongPassword = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Must contain at least one uppercase letter")
  .regex(/[a-z]/, "Must contain at least one lowercase letter")
  .regex(/[0-9]/, "Must contain at least one number")
  .regex(/[^a-zA-Z0-9]/, "Must contain at least one special character")

export const SignInSchema = z.object({
  email: z.string().trim().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
})

export const SignUpSchema = z.object({
  firstName: z.string().trim().min(2, "First name must have at least 2 characters"),
  lastName: z.string().trim().min(2, "Last name must have at least 2 characters"),
  email: z.string().trim().email("Invalid email"),
  password: strongPassword,
})

export const ResetPasswordSchema = z.object({
  password: strongPassword,
})

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: strongPassword,
})

export const ChangeEmailSchema = z.object({
  newEmail: z.string().trim().email("Invalid email"),
  currentPassword: z.string().min(1, "Password is required"),
})

export const DeleteAccountSchema = z.object({
  currentPassword: z.string().min(1, "Password is required"),
})

export const SetupSchema = SignUpSchema
