import { getTranslations } from 'next-intl/server'
import { AuthCard } from '@/components/auth/auth-card'
import { ActivateCodeForm } from '@/components/qr/activate-code-form'

export default async function ActivatePage() {
  const t = await getTranslations('Auth')
  return (
    <AuthCard
      title={t('activateTitle')}
      description={t('activateDescription')}
    >
      <ActivateCodeForm />
    </AuthCard>
  )
}
