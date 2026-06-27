import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { getDiscountCoupon } from '@/queries/discount-coupons'
import { DiscountCouponEditForm } from '@/components/discount-coupons/discount-coupon-edit-form'
import { Card, CardContent, CardHeader, CardTitle } from '@genealogiq/ui/card'
import { Separator } from '@genealogiq/ui/separator'

export default async function EditDiscountCouponPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const coupon = await getDiscountCoupon(id)
  if (!coupon) notFound()
  const t = await getTranslations('DiscountCoupons')

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="scroll-m-20 text-2xl font-bold tracking-tight">
            {t('edit')}
          </CardTitle>
        </CardHeader>
        <Separator />
        <CardContent>
          <DiscountCouponEditForm
            id={coupon.id}
            code={coupon.code}
            description={coupon.description}
          />
        </CardContent>
      </Card>
    </div>
  )
}
