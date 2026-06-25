"use server"

import { redirect } from "next/navigation"
import bcrypt from "bcryptjs"
import { z, flattenError } from "zod"
import { signIn, signOut } from "@/auth"
import { prisma } from "@/lib/prisma"
import { SetupSchema, ResetPasswordSchema, ChangePasswordSchema, ChangeEmailSchema, DeleteAccountSchema } from "@/lib/auth"
import { getCompanySchema, type CompanyFormValues } from "@/schemas/company.schema"
import { identityTranslator } from "@/schemas/i18n"
import { sendPasswordResetEmail, sendEmailChangeEmail, sendAccountDeletionEmail } from "@/lib/email"
import { verifySession } from "@/lib/dal"
import { getClientIp, checkRateLimit } from "@/lib/rate-limit"
import { hashToken } from "@genealogiq/core"
import { createLoginAction } from "@genealogiq/auth/login"
import { randomBytes } from "crypto"

type AuthState = {
  errors?: Record<string, string[] | undefined>
  error?: string
  success?: string
} | undefined

const _login = createLoginAction({
  signIn,
  loadLockoutFields: (email) =>
    prisma.user.findUnique({
      where: { email },
      select: { id: true, emailVerified: true, lockedUntil: true, failedLoginAttempts: true },
    }),
  persistFailedLogin: (id, data) => prisma.user.update({ where: { id }, data }),
  redirectTo: "/dashboard",
})

export async function login(prevState: AuthState, formData: FormData): Promise<AuthState> {
  return _login(prevState, formData)
}

export async function setupSystem(
  companyData: CompanyFormValues,
  adminData: { firstName: string; lastName: string; email: string; password: string },
): Promise<{ error: string } | void> {
  const count = await prisma.user.count()
  if (count > 0) return { error: "The system is already configured." }

  const companyValidated = getCompanySchema(identityTranslator).safeParse(companyData)
  if (!companyValidated.success) return { error: "Invalid company data." }

  const adminValidated = SetupSchema.safeParse(adminData)
  if (!adminValidated.success) return { error: "Invalid administrator data." }

  const { password, ...adminRest } = adminValidated.data

  const existing = await prisma.user.findUnique({ where: { email: adminRest.email }, select: { id: true } })
  if (existing) return { error: "This email is already in use" }

  const hashedPassword = await bcrypt.hash(password, 12)

  const { address, ...companyRest } = companyValidated.data

  const addressCreate = address && Object.values(address).some(Boolean)
    ? { create: address }
    : undefined

  await prisma.$transaction([
    prisma.company.create({ data: { ...companyRest, address: addressCreate } }),
    prisma.user.create({
      data: { ...adminRest, password: hashedPassword, role: "SUPER_ADMIN", emailVerified: new Date() },
    }),
  ])

  redirect("/sign-in")
}

export async function forgotPassword(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = formData.get("email")
  const validated = z.string().email("Invalid email").safeParse(email)
  if (!validated.success) return { error: "Invalid email" }

  const ip    = await getClientIp()
  const limit = await checkRateLimit({ key: `forgot:ip:${ip}`, maxAttempts: 3, windowSeconds: 3600 })
  if (!limit.allowed) return { error: `Too many requests. Try again in ${Math.ceil(limit.retryAfter / 60)} minute(s).` }

  const user = await prisma.user.findUnique({
    where: { email: validated.data },
    select: { id: true },
  })

  // Identical response regardless of whether the email exists (prevents enumeration)
  if (!user) redirect("/forgot-password?sent=true")

  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } })

  const token = randomBytes(32).toString("hex")
  await prisma.passwordResetToken.create({
    data: { token: hashToken(token), userId: user.id, expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
  })

  await sendPasswordResetEmail(validated.data, token)
  redirect("/forgot-password?sent=true")
}

export async function resetPassword(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const token = formData.get("token") as string
  const validated = ResetPasswordSchema.safeParse({ password: formData.get("password") })

  if (!validated.success) {
    return { errors: flattenError(validated.error).fieldErrors }
  }

  const ip    = await getClientIp()
  const limit = await checkRateLimit({ key: `reset:ip:${ip}`, maxAttempts: 5, windowSeconds: 3600 })
  if (!limit.allowed) return { error: `Too many attempts. Try again in ${Math.ceil(limit.retryAfter / 60)} minute(s).` }

  const record = await prisma.passwordResetToken.findUnique({
    where: { token: hashToken(token) },
    select: { userId: true, expiresAt: true },
  })

  if (!record || !record.userId || record.expiresAt < new Date()) {
    return { error: "Invalid or expired link. Please request a new one." }
  }

  const hashedPassword = await bcrypt.hash(validated.data.password, 12)

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { password: hashedPassword },
    }),
    prisma.passwordResetToken.delete({ where: { token: hashToken(token) } }),
  ])

  redirect("/sign-in?reset=true")
}

export async function changePassword(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const session = await verifySession()

  const validated = ChangePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
  })
  if (!validated.success) return { errors: flattenError(validated.error).fieldErrors }

  const userId = session.user!.id!
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { password: true },
  })
  if (!user?.password) return { error: "User not found" }

  const match = await bcrypt.compare(validated.data.currentPassword, user.password)
  if (!match) return { errors: { currentPassword: ["Incorrect current password"] } }

  const same = await bcrypt.compare(validated.data.newPassword, user.password)
  if (same) return { errors: { newPassword: ["New password must differ from current"] } }

  const hashed = await bcrypt.hash(validated.data.newPassword, 12)
  await prisma.user.update({ where: { id: userId }, data: { password: hashed } })

  return { success: "Password changed successfully." }
}

export async function requestEmailChange(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const session = await verifySession()

  const validated = ChangeEmailSchema.safeParse({
    newEmail: formData.get("newEmail"),
    currentPassword: formData.get("currentPassword"),
  })
  if (!validated.success) return { errors: flattenError(validated.error).fieldErrors }

  const ip    = await getClientIp()
  const limit = await checkRateLimit({ key: `change-email:ip:${ip}`, maxAttempts: 5, windowSeconds: 3600 })
  if (!limit.allowed) return { error: `Too many attempts. Try again in ${Math.ceil(limit.retryAfter / 60)} minute(s).` }

  const userId = session.user!.id!
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, password: true },
  })
  if (!user?.password) return { error: "User not found" }

  if (validated.data.newEmail === user.email) {
    return { errors: { newEmail: ["New email must be different from current"] } }
  }

  const match = await bcrypt.compare(validated.data.currentPassword, user.password)
  if (!match) return { errors: { currentPassword: ["Incorrect password"] } }

  const existing = await prisma.user.findUnique({ where: { email: validated.data.newEmail } })
  if (existing) return { errors: { newEmail: ["This email is already in use"] } }

  await prisma.emailToken.deleteMany({ where: { userId, type: 'CHANGE' } })

  const token = randomBytes(32).toString("hex")
  await prisma.emailToken.create({
    data: {
      token: hashToken(token),
      type: 'CHANGE',
      userId,
      newEmail: validated.data.newEmail,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  })

  await sendEmailChangeEmail(validated.data.newEmail, token)

  return { success: "Confirmation link sent to the new email." }
}

export async function deleteAccount(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const session = await verifySession()

  const validated = DeleteAccountSchema.safeParse({ currentPassword: formData.get("currentPassword") })
  if (!validated.success) return { errors: flattenError(validated.error).fieldErrors }

  const userId = session.user!.id!
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, password: true },
  })
  if (!user?.password) return { error: "User not found" }

  const match = await bcrypt.compare(validated.data.currentPassword, user.password)
  if (!match) return { errors: { currentPassword: ["Incorrect password"] } }

  await sendAccountDeletionEmail(user.email)
  await prisma.user.delete({ where: { id: userId } })

  await signOut({ redirectTo: "/" })
}

export async function logout(): Promise<void> {
  await signOut({ redirectTo: "/" })
}
