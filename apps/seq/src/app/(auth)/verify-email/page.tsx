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
        title="Verify your email"
        description="Confirmation email sent."
        body="Click the link we sent to confirm your account. The link expires in 1 hour."
        buttonText="Go to sign in"
        buttonHref="/sign-in"
        buttonVariant="outline"
      />
    )
  }

  const record = await prisma.emailToken.findUnique({
    where: { token: hashToken(token) },
  })

  // userId is nullable in the schema (also supports AppUser tokens written by
  // APP); SEQ only ever issues User-bound tokens, so reject if absent.
  if (!record || !record.userId || record.expiresAt < new Date()) {
    if (record) {
      await prisma.emailToken.delete({ where: { token: hashToken(token) } })
    }
    return (
      <VerifyEmailCard
        title="Invalid or expired link"
        description="This verification link is not valid or has already expired."
        body="Request a new link from your profile page."
        buttonText="Go to sign in"
        buttonHref="/sign-in"
        buttonVariant="outline"
      />
    )
  }
  const userId = record.userId

  if (record.type === 'CHANGE') {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { email: record.newEmail!, emailVerified: new Date() },
      }),
      prisma.emailToken.delete({ where: { token: hashToken(token) } }),
    ])

    return (
      <VerifyEmailCard
        title="Email changed!"
        description="Your email has been updated successfully."
        body="Sign in again with your new email address."
        buttonText="Sign in"
        buttonHref="/sign-in"
      />
    )
  }

  // VERIFICATION
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { emailVerified: new Date() },
    }),
    prisma.emailToken.delete({ where: { token: hashToken(token) } }),
  ])

  return (
    <VerifyEmailCard
      title="Email confirmed!"
      description="Your account has been verified successfully."
      body="You can now sign in with your email and password."
      buttonText="Sign in"
      buttonHref="/sign-in"
    />
  )
}
