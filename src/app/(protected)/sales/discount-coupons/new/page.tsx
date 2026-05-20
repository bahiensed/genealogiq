import { DiscountCouponForm } from '@/components/discount-coupons/discount-coupon-form'
import { getActivePackagesForSelect } from '@/queries/discount-coupons'

export default async function NewDiscountCouponPage() {
  const packages = await getActivePackagesForSelect()

  return (
    <div className="flex flex-col gap-6">
      <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">
        New discount coupon
      </h1>
      <DiscountCouponForm
        packages={packages.map(({ id, name, price, quantity }) => ({
          id,
          name,
          price: Number(price),
          quantity,
        }))}
      />
    </div>
  )
}
