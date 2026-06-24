import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { verifySession } from '@/lib/dal'
import { getSubscriptions } from '@/queries/subscriptions'
import { SubscriptionsDataTable } from '@/components/subscriptions/subscriptions-data-table'
import { Button } from '@genealogiq/ui/button'

export default async function SubscriptionsPage() {
  const session = await verifySession()
  const subscriptions = await getSubscriptions()
  const t = await getTranslations('Subscriptions')

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">
          {t('title')}
        </h1>
        <Button asChild>
          <Link href="/subscriptions/new">{t('new')}</Link>
        </Button>
      </div>

      <SubscriptionsDataTable currentUserRole={session.user.role} data={subscriptions} />
    </div>
  )
}
