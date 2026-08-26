import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { Button } from '@genealogiq/ui/button'
import { verifySession } from '@/lib/dal'
import { getPartnerSubscriptions } from '@/queries/partner-subscriptions'
import { ContractsDataTable } from '@/components/partner-subscriptions/contracts-data-table'

// Replaces /sales/manual-sales. What is listed is no longer an order for a
// batch of codes but a standing contract, which is why the renewal count and
// the cycle window matter more than a single amount.
export default async function ContractsPage() {
  await verifySession()
  const [contracts, t] = await Promise.all([getPartnerSubscriptions(), getTranslations('Contracts')])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">{t('title')}</h1>
          <p className="text-muted-foreground mt-2">{t('subtitle')}</p>
        </div>
        <Button asChild><Link href="/sales/contracts/new">{t('newButton')}</Link></Button>
      </div>
      <ContractsDataTable data={contracts} />
    </div>
  )
}
