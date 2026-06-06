"use server"

import { redirect } from "next/navigation"
import { AuthError } from "next-auth"
import bcrypt from "bcryptjs"
import { z, flattenError } from "zod"
import { signIn, signOut } from "@/auth"
import { prisma } from "@/lib/prisma"
import {
  SignInSchema,
  SignUpSchema,
  ResetPasswordSchema,
  ChangePasswordSchema,
  ChangeEmailSchema,
  DeleteAccountSchema,
} from "@/lib/auth"
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendEmailChangeEmail,
  sendAccountDeletionEmail,
} from "@/lib/email"
import { verifySession } from "@/lib/dal"
import { deleteBlobs } from "@/lib/blob"
import { getClientIp, checkRateLimit } from "@/lib/rate-limit"
import { hashToken } from "@/lib/token"
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

  const ip    = await getClientIp()
  const limit = await checkRateLimit({ key: `signin:ip:${ip}`, maxAttempts: 10, windowSeconds: 300 })
  if (!limit.allowed) return { error: `Too many sign-in attempts. Try again in ${limit.retryAfter}s.` }

  const user = await prisma.appUser.findFirst({
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
    await signIn("credentials", { ...validated.data, redirectTo: "/home" })
  } catch (error) {
    if (error instanceof AuthError) {
      if (user) {
        const base = user.lockedUntil && user.lockedUntil < new Date() ? 0 : user.failedLoginAttempts
        const newCount = base + 1
        await prisma.appUser.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: newCount,
            lockedUntil: newCount >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null,
          },
        })
      }
      return { error: "Incorrect email or password" }
    }
    throw error
  }
}

export async function signUp(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const data = {
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    password: formData.get("password"),
  }

  const validated = SignUpSchema.safeParse(data)
  if (!validated.success) {
    return { errors: flattenError(validated.error).fieldErrors }
  }

  const ip    = await getClientIp()
  const limit = await checkRateLimit({ key: `signup:ip:${ip}`, maxAttempts: 5, windowSeconds: 3600 })
  if (!limit.allowed) return { error: `Too many sign-up attempts. Try again in ${Math.ceil(limit.retryAfter / 60)} minute(s).` }

  const existing = await prisma.appUser.findFirst({
    where: { email: validated.data.email },
    select: { id: true },
  })
  if (existing) {
    return { errors: { email: ["This email is already in use"] } }
  }

  const hashedPassword = await bcrypt.hash(validated.data.password, 12)

  const user = await prisma.appUser.create({
    data: {
      firstName: validated.data.firstName,
      lastName: validated.data.lastName,
      email: validated.data.email,
      password: hashedPassword,
      role: "APP_USER",
    },
    select: { id: true },
  })

  await prisma.emailToken.deleteMany({ where: { appUserId: user.id, type: "VERIFICATION" } })

  const token = randomBytes(32).toString("hex")
  await prisma.emailToken.create({
    data: {
      token: hashToken(token),
      type: "VERIFICATION",
      appUserId: user.id,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  })

  await sendVerificationEmail(validated.data.email, token)

  redirect("/verify-email")
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

  const user = await prisma.appUser.findFirst({
    where: { email: validated.data },
    select: { id: true, email: true },
  })

  if (!user) redirect("/forgot-password?sent=true")

  await prisma.passwordResetToken.deleteMany({ where: { appUserId: user.id } })

  const token = randomBytes(32).toString("hex")
  await prisma.passwordResetToken.create({
    data: { token: hashToken(token), appUserId: user.id, expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
  })

  await sendPasswordResetEmail(user.email!, token)
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
    select: { appUserId: true, userId: true, expiresAt: true },
  })

  if (!record || record.expiresAt < new Date()) {
    return { error: "Invalid or expired link. Please request a new one." }
  }

  // appUserId for new tokens; userId as fallback for tokens created before Phase 3
  const appUserId = record.appUserId ?? record.userId!
  const hashedPassword = await bcrypt.hash(validated.data.password, 12)

  await prisma.$transaction([
    prisma.appUser.update({
      where: { id: appUserId },
      data: { password: hashedPassword, emailVerified: new Date() },
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
  const user = await prisma.appUser.findUnique({
    where: { id: userId },
    select: { password: true },
  })
  if (!user?.password) return { error: "User not found" }

  const match = await bcrypt.compare(validated.data.currentPassword, user.password)
  if (!match) return { errors: { currentPassword: ["Incorrect current password"] } }

  const same = await bcrypt.compare(validated.data.newPassword, user.password)
  if (same) return { errors: { newPassword: ["New password must differ from current"] } }

  const hashed = await bcrypt.hash(validated.data.newPassword, 12)
  await prisma.appUser.update({ where: { id: userId }, data: { password: hashed } })

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
  const user = await prisma.appUser.findUnique({
    where: { id: userId },
    select: { email: true, password: true },
  })
  if (!user?.password) return { error: "User not found" }

  if (validated.data.newEmail === user.email) {
    return { errors: { newEmail: ["New email must be different from current"] } }
  }

  const match = await bcrypt.compare(validated.data.currentPassword, user.password)
  if (!match) return { errors: { currentPassword: ["Incorrect password"] } }

  const existing = await prisma.appUser.findFirst({ where: { email: validated.data.newEmail } })
  if (existing) return { errors: { newEmail: ["This email is already in use"] } }

  await prisma.emailToken.deleteMany({ where: { appUserId: userId, type: "CHANGE" } })

  const token = randomBytes(32).toString("hex")
  await prisma.emailToken.create({
    data: {
      token: hashToken(token),
      type: "CHANGE",
      appUserId: userId,
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
  const user = await prisma.appUser.findUnique({
    where: { id: userId },
    select: { email: true, password: true },
  })
  if (!user?.password) return { error: "User not found" }

  const match = await bcrypt.compare(validated.data.currentPassword, user.password)
  if (!match) return { errors: { currentPassword: ["Incorrect password"] } }

  const [ownProfile, ownBio, ownGallery, ownGeo, ownTributesAuthored, ownTributesReceived] =
    await Promise.all([
      prisma.appUser.findUnique({ where: { id: userId }, select: { avatarUrl: true } }),
      prisma.bio.findUnique({ where: { userId }, select: { images: { select: { url: true } } } }),
      prisma.galleryItem.findMany({ where: { userId }, select: { url: true } }),
      prisma.geolocation.findUnique({ where: { userId }, select: { photo1: true, photo2: true, photo3: true } }),
      prisma.tribute.findMany({ where: { authorId: userId }, select: { imageUrl: true } }),
      prisma.tribute.findMany({ where: { profileId: userId }, select: { imageUrl: true } }),
    ])

  const memorials = await prisma.appUser.findMany({
    where: { role: "APP_MEMO", guardedBy: { some: { guardianId: userId, status: "ACCEPTED" } } },
    select: { id: true, avatarUrl: true },
  })
  const memorialIds = memorials.map((m) => m.id)
  const [memBios, memGallery, memTributes, memGeos] = memorialIds.length > 0
    ? await Promise.all([
        prisma.bio.findMany({ where: { userId: { in: memorialIds } }, select: { images: { select: { url: true } } } }),
        prisma.galleryItem.findMany({ where: { userId: { in: memorialIds } }, select: { url: true } }),
        prisma.tribute.findMany({ where: { profileId: { in: memorialIds } }, select: { imageUrl: true } }),
        prisma.geolocation.findMany({ where: { userId: { in: memorialIds } }, select: { photo1: true, photo2: true, photo3: true } }),
      ])
    : [[], [], [], []]

  await deleteBlobs([
    ownProfile?.avatarUrl,
    ...(ownBio?.images.map((i) => i.url) ?? []),
    ...ownGallery.map((i) => i.url),
    ownGeo?.photo1, ownGeo?.photo2, ownGeo?.photo3,
    ...ownTributesAuthored.map((t) => t.imageUrl),
    ...ownTributesReceived.map((t) => t.imageUrl),
    ...memorials.map((m) => m.avatarUrl),
    ...memBios.flatMap((b) => b.images.map((i) => i.url)),
    ...memGallery.map((i) => i.url),
    ...memTributes.map((t) => t.imageUrl),
    ...memGeos.flatMap((g) => [g.photo1, g.photo2, g.photo3]),
  ])

  if (memorialIds.length > 0) {
    await prisma.appUser.deleteMany({ where: { id: { in: memorialIds } } })
  }

  await sendAccountDeletionEmail(user.email!)
  await prisma.appUser.delete({ where: { id: userId } })

  await signOut({ redirectTo: "/" })
}

export async function logout(): Promise<void> {
  await signOut({ redirectTo: "/" })
}
