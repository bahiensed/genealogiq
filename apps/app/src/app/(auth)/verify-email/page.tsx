import { prisma } from '@/lib/prisma'
import { hashToken } from '@/lib/token'
import { VerifyEmailCard } from '@/components/auth/verify-email-card'

interface Props {
  searchParams: Promise<{ token?: string }>
}

export default async function VerifyEmailPage({ searchParams }: Props) {
  const { token } = await searchParams

  if (!token) {
    return (
      <VerifyEmailCard
        title="Check your e-mail"
        description="Confirmation e-mail sent."
        body="Click the link we sent to confirm your e-mail. The link expires in 24 hours."
        buttonText="Go to sign in"
        buttonHref="/sign-in"
        buttonVariant="outline"
      />
    )
  }

  const record = await prisma.emailToken.findUnique({
    where: { token: hashToken(token) },
  })

  if (!record || record.expiresAt < new Date()) {
    if (record) {
      await prisma.emailToken.delete({ where: { token: hashToken(token) } })
    }
    return (
      <VerifyEmailCard
        title="Invalid or expired link"
        description="This verification link is invalid or has already expired."
        body="Please sign up again or request a new verification link."
        buttonText="Go to sign in"
        buttonHref="/sign-in"
        buttonVariant="outline"
      />
    )
  }

  // appUserId for new tokens; userId as fallback for tokens created before Phase 3
  const appUserId = record.appUserId ?? record.userId!

  if (record.type === 'CHANGE') {
    await prisma.$transaction([
      prisma.appUser.update({
        where: { id: appUserId },
        data: { email: record.newEmail!, emailVerified: new Date() },
      }),
      prisma.emailToken.delete({ where: { token: hashToken(token) } }),
    ])

    return (
      <VerifyEmailCard
        title="E-mail changed!"
        description="Your e-mail has been updated successfully."
        body="Sign in again with your new e-mail address."
        buttonText="Sign in"
        buttonHref="/sign-in"
      />
    )
  }

  await prisma.$transaction([
    prisma.appUser.update({
      where: { id: appUserId },
      data: { emailVerified: new Date() },
    }),
    prisma.emailToken.delete({ where: { token: hashToken(token) } }),
  ])

  return (
    <VerifyEmailCard
      title="E-mail confirmed!"
      description="Your account has been verified successfully."
      body="You can now sign in with your e-mail and password."
      buttonText="Sign in"
      buttonHref="/sign-in"
    />
  )
}
