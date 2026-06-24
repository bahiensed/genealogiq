import { getTranslations } from 'next-intl/server'
import { prisma } from '@/lib/prisma'
import { hashToken } from '@genealogiq/core'
import { VerifyEmailCard } from '@/components/auth/verify-email-card'
import { safeCallback } from '@/lib/safe-callback'

interface Props {
  searchParams: Promise<{ token?: string; callbackUrl?: string }>
}

export default async function VerifyEmailPage({ searchParams }: Props) {
  const t = await getTranslations('Auth')
  const { token, callbackUrl: rawCallback } = await searchParams
  // After verification, return the user to where they started (e.g. /qr/<code>).
  const callbackUrl = safeCallback(rawCallback)
  const signInHref = callbackUrl ? `/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/sign-in"

  if (!token) {
    return (
      <VerifyEmailCard
        title={t('verifyCheckTitle')}
        description={t('verifyCheckDescription')}
        body={t('verifyCheckBody')}
        buttonText={t('goToSignIn')}
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
        title={t('verifyInvalidTitle')}
        description={t('verifyInvalidDescription')}
        body={t('verifyInvalidBody')}
        buttonText={t('goToSignIn')}
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
        title={t('verifyChangedTitle')}
        description={t('verifyChangedDescription')}
        body={t('verifyChangedBody')}
        buttonText={t('signIn')}
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
      title={t('verifyConfirmedTitle')}
      description={t('verifyConfirmedDescription')}
      body={t('verifyConfirmedBody')}
      buttonText={t('signIn')}
      buttonHref={signInHref}
    />
  )
}
