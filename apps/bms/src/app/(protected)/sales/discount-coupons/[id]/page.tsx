import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { getDiscountCoupon } from '@/queries/discount-coupons'
import { DiscountCouponEditForm } from '@/components/discount-coupons/discount-coupon-edit-form'

export default async function EditDiscountCouponPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const coupon = await getDiscountCoupon(id)
  if (!coupon) notFound()
  const t = await getTranslations('DiscountCoupons')

  return (
    <div className="flex flex-col gap-6">
      <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">
        {t('edit')}
      </h1>
      <DiscountCouponEditForm
        id={coupon.id}
        code={coupon.code}
        description={coupon.description}
      />
    </div>
  )
}
