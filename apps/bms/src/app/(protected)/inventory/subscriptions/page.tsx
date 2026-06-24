import { getTranslations } from 'next-intl/server'

export default async function Page() {
  const t = await getTranslations('Subscriptions')

  return (
    <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">
      {t('availableTitle')}
    </h1>
  )
}
