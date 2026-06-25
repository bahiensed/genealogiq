import { getTranslations } from 'next-intl/server'
import { DiscountCouponForm } from '@/components/discount-coupons/discount-coupon-form'
import { getActivePackagesForSelect } from '@/queries/discount-coupons'

export default async function NewDiscountCouponPage() {
  const packages = await getActivePackagesForSelect()
  const t = await getTranslations('DiscountCoupons')

  return (
    <div className="flex flex-col gap-6">
      <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">
        {t('new')}
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
