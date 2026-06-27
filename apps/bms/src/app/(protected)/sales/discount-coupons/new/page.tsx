import { getTranslations } from 'next-intl/server'
import { DiscountCouponForm } from '@/components/discount-coupons/discount-coupon-form'
import { getActivePackagesForSelect } from '@/queries/discount-coupons'
import { Card, CardContent, CardHeader, CardTitle } from '@genealogiq/ui/card'
import { Separator } from '@genealogiq/ui/separator'

export default async function NewDiscountCouponPage() {
  const packages = await getActivePackagesForSelect()
  const t = await getTranslations('DiscountCoupons')

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="scroll-m-20 text-2xl font-bold tracking-tight">
            {t('new')}
          </CardTitle>
        </CardHeader>
        <Separator />
        <CardContent>
          <DiscountCouponForm
            packages={packages.map(({ id, name, price, quantity }) => ({
              id,
              name,
              price: Number(price),
              quantity,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  )
}
