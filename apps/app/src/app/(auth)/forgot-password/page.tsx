import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { AuthCard } from '@/components/auth/auth-card'
import { Button } from '@/components/ui/button'
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'

interface Props {
  searchParams: Promise<{ sent?: string }>
}

export default async function ForgotPasswordPage({ searchParams }: Props) {
  const { sent } = await searchParams

  if (sent === "true") {
    const t = await getTranslations('Auth')
    return (
      <AuthCard
        title={t('forgotSentTitle')}
        description={t('forgotSentDescription')}
      >
        <p className="text-sm text-muted-foreground">
          {t('forgotSentBody')}
        </p>
        <Button asChild variant="outline" className="w-full">
          <Link href="/sign-in">{t('backToSignIn')}</Link>
        </Button>
      </AuthCard>
    )
  }

  return <ForgotPasswordForm />
}
