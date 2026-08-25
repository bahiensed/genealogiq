import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { verifySession } from '@/lib/dal'
import { getDiscountCoupons } from '@/queries/discount-coupons'
import { DiscountCouponsDataTable } from '@/components/discount-coupons/discount-coupons-data-table'
import type { DiscountCouponRow } from '@/components/discount-coupons/columns'
import { Button } from '@genealogiq/ui/button'

export default async function DiscountCouponsPage() {
  const session = await verifySession()
  const t = await getTranslations('DiscountCoupons')

  // Defensive: if the query throws (Prisma schema drift, missing Stripe key
  // propagating from an unexpected import, etc.) we surface the real message
  // in the Vercel logs and still render the page header so the UI doesn't 500.
  let coupons: DiscountCouponRow[] = []
  let loadError: string | null = null
  try {
    const raw = await getDiscountCoupons()
    coupons = raw.map((c) => ({ ...c, percentOff:   c.percentOff   === null ? null : Number(c.percentOff),
    amountOffUsd: c.amountOffUsd === null ? null : Number(c.amountOffUsd),
    amountOffBrl: c.amountOffBrl === null ? null : Number(c.amountOffBrl),
    amountOffMxn: c.amountOffMxn === null ? null : Number(c.amountOffMxn) }))
  } catch (err) {
    console.error('[discount-coupons] page load failed', err)
    loadError = err instanceof Error ? err.message : 'Could not load coupons.'
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">
          {t('title')}
        </h1>
        <Button asChild>
          <Link href="/sales/discount-coupons/new">{t('new')}</Link>
        </Button>
      </div>

      {loadError ? (
        <p className="text-sm text-destructive">
          {t('loadError', { message: loadError })}
        </p>
      ) : (
        <DiscountCouponsDataTable currentUserRole={session.user.role} data={coupons} />
      )}
    </div>
  )
}
