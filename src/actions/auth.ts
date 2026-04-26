"use server"

import { redirect } from "next/navigation"
import { AuthError } from "next-auth"
import bcrypt from "bcryptjs"
import { z, flattenError } from "zod"
import { signIn, signOut } from "@/auth"
import { prisma } from "@/lib/prisma"
import { SignInSchema, SetupSchema, ResetPasswordSchema, ChangePasswordSchema, ChangeEmailSchema, DeleteAccountSchema } from "@/lib/auth"
import { companySchema, type CompanyFormValues } from "@/schemas/company.schema"
import { sendPasswordResetEmail, sendEmailChangeEmail, sendAccountDeletionEmail } from "@/lib/email"
import { verifySession } from "@/lib/dal"
import { randomBytes } from "crypto"

type AuthState = {
  errors?: Record<string, string[] | undefined>
  error?: string
  success?: string
} | undefined

export async function login(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const data = {
    email: formData.get("email"),
    password: formData.get("password"),
  }

  const validated = SignInSchema.safeParse(data)
  if (!validated.success) return { error: "Invalid data" }

  const user = await prisma.user.findUnique({
    where: { email: validated.data.email },
    select: { id: true, emailVerified: true, lockedUntil: true, failedLoginAttempts: true },
  })

  if (user?.lockedUntil && user.lockedUntil > new Date()) {
    const minutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000)
    return { error: `Account temporarily locked. Try again in ${minutes} minute(s).` }
  }

  if (user && user.emailVerified === null) {
    return { error: "Please verify your email before signing in. Check your inbox." }
  }

  try {
    await signIn("credentials", { ...validated.data, redirectTo: "/dashboard" })
  } catch (error) {
    if (error instanceof AuthError) {
      if (user) {
        const base = user.lockedUntil && user.lockedUntil < new Date() ? 0 : user.failedLoginAttempts
        const newCount = base + 1
        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: newCount,
            lockedUntil: newCount >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null,
          },
        })
      }
      return { error: "Incorrect email or password" }
    }
    throw error // re-throw para o redirect funcionar
  }
}

export async function setupSystem(
  companyData: CompanyFormValues,
  adminData: { firstName: string; lastName: string; email: string; password: string },
): Promise<{ error: string } | void> {
  const count = await prisma.user.count()
  if (count > 0) return { error: "The system is already configured." }

  const companyValidated = companySchema.safeParse(companyData)
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

  const user = await prisma.user.findUnique({
    where: { email: validated.data },
    select: { id: true },
  })

  // Identical response regardless of whether the email exists (prevents enumeration)
  if (!user) redirect("/forgot-password?sent=true")

  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } })

  const token = randomBytes(32).toString("hex")
  await prisma.passwordResetToken.create({
    data: { token, userId: user.id, expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
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

  const record = await prisma.passwordResetToken.findUnique({
    where: { token },
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
    prisma.passwordResetToken.delete({ where: { token } }),
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
      token,
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
