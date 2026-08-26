import { getTranslations } from 'next-intl/server'
import { verifySession } from '@/lib/dal'
import { getPartnerPlans } from '@/queries/partner-plans'
import Link from 'next/link'
import { Button } from '@genealogiq/ui/button'
import { PartnerPlansDataTable } from '@/components/partner-plans/partner-plans-data-table'

// The B2B catalogue. What a partner subscribes to — not stock they buy, which
// is why this replaced /gencodes rather than being added beside it.
export default async function PartnerPlansPage() {
  await verifySession()
  const [plans, t] = await Promise.all([getPartnerPlans(), getTranslations('PartnerPlans')])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">
            {t('title')}
          </h1>
          <p className="text-muted-foreground mt-2">{t('subtitle')}</p>
        </div>
        <Button asChild><Link href="/plans/new">{t('newButton')}</Link></Button>
      </div>

      <PartnerPlansDataTable data={plans} />
    </div>
  )
}
