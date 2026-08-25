'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { toast } from 'sonner'
import { ShoppingCart } from 'lucide-react'
import { createPackageCheckoutSession } from '@/actions/checkout.actions'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@genealogiq/ui/card'
import { Button } from '@genealogiq/ui/button'
import { Input } from '@genealogiq/ui/input'
import { Separator } from '@genealogiq/ui/separator'

export interface QRPackage {
  id: string
  name: string
  description: string | null
  price: number
  /** Null when this product is not offered in instalments. */
  monthlyPrice: number | null
  termLength: number
  quantity: number
}

export type QRStoreVariant = 'digital' | 'physical'

export function QRStore({ packages, variant = 'digital' }: { packages: QRPackage[]; variant?: QRStoreVariant }) {
  const t = useTranslations('Purchasing')

  if (packages.length === 0) {
    return (
      <p className="text-muted-foreground">
        {variant === 'physical' ? t('empty.physical') : t('empty.digital')}
      </p>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {packages.map((pkg) => (
        <PackageCard key={pkg.id} pkg={pkg} variant={variant} />
      ))}
    </div>
  )
}

function PackageCard({ pkg, variant }: { pkg: QRPackage; variant: QRStoreVariant }) {
  const router = useRouter()
  const t = useTranslations('Purchasing')
  const locale = useLocale()
  const [qty, setQty] = useState(1)
  const [cadence, setCadence] = useState<'annual' | 'monthly'>('annual')
  const [isPending, startTransition] = useTransition()

  const usd = new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' })

  function handleBuy() {
    startTransition(async () => {
      const result = await createPackageCheckoutSession(pkg.id, qty, cadence)
      if (!result.ok) {
        toast.error(result.message)
        return
      }
      router.push(result.data!.url)
    })
  }

  const isPhysical    = variant === 'physical'
  const revenueUpside = pkg.price * 5

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>{pkg.name}</CardTitle>
        <CardDescription>
          {isPhysical
            ? t('card.physicalDescription', { count: pkg.quantity })
            : t('card.digitalDescription', { count: pkg.quantity })}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4">
        {/* Marketing copy */}
        <div className="flex flex-col gap-0.5">
          {isPhysical ? (
            <>
              <p className="text-sm font-medium">{t('card.physicalHeadline')}</p>
              <p className="text-sm text-muted-foreground">
                {t('card.physicalSubcopy', { amount: usd.format(revenueUpside) })}
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium">{t('card.digitalHeadline')}</p>
              <p className="text-sm text-muted-foreground">
                {t('card.digitalSubcopy', { amount: usd.format(revenueUpside) })}
              </p>
            </>
          )}
        </div>

        <Separator />

        {/* Price */}
        <div>
          <p className="text-xs text-muted-foreground">
            {isPhysical ? t('card.priceFrom') : t('card.priceForAsLittleAs')}
          </p>
          <p className="text-3xl font-bold">{usd.format(pkg.price)}</p>
          <p className="text-sm text-muted-foreground">
            {isPhysical
              ? t('card.physicalPriceUnit', { count: pkg.quantity })
              : t('card.digitalPriceUnit', { count: pkg.quantity })}
          </p>
        </div>

        {/* Amount */}
        <div className="mt-auto flex items-center gap-2 pt-2">
          <span className="text-sm font-medium whitespace-nowrap">{t('card.amount')}</span>
          <Input
            type="number"
            min={1}
            value={qty}
            onChange={(e) => setQty(Math.max(1, Math.trunc(Number(e.target.value))))}
            className="w-24"
          />
        </div>
      </CardContent>

      <CardFooter className="border-t">
        <Button className="w-full" onClick={handleBuy} disabled={isPending}>
          <ShoppingCart className="mr-2 h-4 w-4" />
          {isPending
            ? t('card.processing')
            : isPhysical
              ? t('card.buyPhysical')
              : t('card.buyDigital')}
        </Button>
      </CardFooter>
    </Card>
  )
}
