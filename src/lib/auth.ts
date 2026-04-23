import { z } from "zod"

export const SignInSchema = z.object({
  email: z.string().trim().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
})

export const SignUpSchema = z.object({
  firstName: z.string().trim().min(2, "First name must have at least 2 characters"),
  lastName: z.string().trim().min(2, "Last name must have at least 2 characters"),
  email: z.string().trim().email("Invalid email"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain at least one uppercase letter")
    .regex(/[a-z]/, "Must contain at least one lowercase letter")
    .regex(/[0-9]/, "Must contain at least one number")
    .regex(/[^a-zA-Z0-9]/, "Must contain at least one special character"),
})

export const ResetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain at least one uppercase letter")
    .regex(/[a-z]/, "Must contain at least one lowercase letter")
    .regex(/[0-9]/, "Must contain at least one number")
    .regex(/[^a-zA-Z0-9]/, "Must contain at least one special character"),
})

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain at least one uppercase letter")
    .regex(/[a-z]/, "Must contain at least one lowercase letter")
    .regex(/[0-9]/, "Must contain at least one number")
    .regex(/[^a-zA-Z0-9]/, "Must contain at least one special character"),
})

export const ChangeEmailSchema = z.object({
  newEmail: z.string().trim().email("Invalid email"),
  currentPassword: z.string().min(1, "Password is required"),
})

export const DeleteAccountSchema = z.object({
  currentPassword: z.string().min(1, "Password is required"),
})

export type SignInInput = z.infer<typeof SignInSchema>
export type SignUpInput = z.infer<typeof SignUpSchema>
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>
