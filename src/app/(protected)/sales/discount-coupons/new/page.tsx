import { DiscountCouponForm } from '@/components/discount-coupons/discount-coupon-form'
import { getPaidSubscriptionsForSelect } from '@/queries/discount-coupons'

export default async function NewDiscountCouponPage() {
  const paidPlans = await getPaidSubscriptionsForSelect()

  return (
    <div className="flex flex-col gap-6">
      <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">
        New discount coupon
      </h1>
      <DiscountCouponForm paidPlans={paidPlans.map(({ id, name, code }) => ({ id, name, code }))} />
    </div>
  )
}
