import Link from 'next/link'
import { verifySession } from '@/lib/dal'
import { getDiscountCoupons } from '@/queries/discount-coupons'
import { DiscountCouponsDataTable } from '@/components/discount-coupons/discount-coupons-data-table'
import { Button } from '@/components/ui/button'

export default async function DiscountCouponsPage() {
  const session = await verifySession()
  const coupons = await getDiscountCoupons()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">
          Discount Coupons
        </h1>
        <Button asChild>
          <Link href="/sales/discount-coupons/new">New coupon</Link>
        </Button>
      </div>

      <DiscountCouponsDataTable currentUserRole={session.user.role} data={coupons} />
    </div>
  )
}
