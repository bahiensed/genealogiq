import { getTranslations } from 'next-intl/server'
import { prisma } from '@/lib/prisma'
import { hashToken } from '@genealogiq/core'
import { VerifyEmailCard } from '@/components/auth/verify-email-card'

interface Props {
  searchParams: Promise<{ token?: string }>
}

export default async function VerifyEmailPage({ searchParams }: Props) {
  const { token } = await searchParams
  const t = await getTranslations('Auth')

  if (!token) {
    return (
      <VerifyEmailCard
        title={t('verify.checkTitle')}
        description={t('verify.checkDescription')}
        body={t('verify.checkBody')}
        buttonText={t('verify.goToSignIn')}
        buttonHref="/sign-in"
        buttonVariant="outline"
      />
    )
  }

  const record = await prisma.emailToken.findUnique({
    where: { token: hashToken(token) },
  })

  // userId is nullable in the schema (also supports AppUser tokens written by
  // SEQ/APP); BMS only ever issues User-bound tokens, so reject if absent.
  if (!record || !record.userId || record.expiresAt < new Date()) {
    if (record) {
      await prisma.emailToken.delete({ where: { token: hashToken(token) } })
    }
    return (
      <VerifyEmailCard
        title={t('verify.invalidTitle')}
        description={t('verify.invalidDescription')}
        body={t('verify.invalidBody')}
        buttonText={t('verify.goToSignIn')}
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
        title={t('verify.changedTitle')}
        description={t('verify.changedDescription')}
        body={t('verify.changedBody')}
        buttonText={t('verify.goToSignIn')}
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
      title={t('verify.confirmedTitle')}
      description={t('verify.confirmedDescription')}
      body={t('verify.confirmedBody')}
      buttonText={t('verify.goToSignIn')}
      buttonHref="/sign-in"
    />
  )
}
