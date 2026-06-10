'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
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
  quantity: number
}

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

export type QRStoreVariant = 'digital' | 'physical'

export function QRStore({ packages, variant = 'digital' }: { packages: QRPackage[]; variant?: QRStoreVariant }) {
  if (packages.length === 0) {
    return (
      <p className="text-muted-foreground">
        {variant === 'physical'
          ? 'No physical QR codes available at the moment.'
          : 'No packages available at the moment.'}
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
  const [qty, setQty] = useState(1)
  const [isPending, startTransition] = useTransition()

  function handleBuy() {
    startTransition(async () => {
      const result = await createPackageCheckoutSession(pkg.id, qty)
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      router.push(result.url)
    })
  }

  const isPhysical    = variant === 'physical'
  const codeWord      = pkg.quantity === 1 ? 'code' : 'codes'
  const revenueUpside = pkg.price * 5

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>{pkg.name}</CardTitle>
        <CardDescription>
          {isPhysical
            ? <>{pkg.quantity} QR {codeWord} ready to print</>
            : <>Package with {pkg.quantity} QR {pkg.quantity === 1 ? 'Code' : 'Codes'}</>}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4">
        {/* Marketing copy */}
        <div className="flex flex-col gap-0.5">
          {isPhysical ? (
            <>
              <p className="text-sm font-medium">
                Print on demand and resell at your own price
              </p>
              <p className="text-sm text-muted-foreground">
                Earn up to {usd.format(revenueUpside)}+ reselling them
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium">
                Boost your margins by up to 500% with this bundle
              </p>
              <p className="text-sm text-muted-foreground">
                Generate {usd.format(revenueUpside)}+ in revenue
              </p>
            </>
          )}
        </div>

        <Separator />

        {/* Price */}
        <div>
          <p className="text-xs text-muted-foreground">{isPhysical ? 'From' : 'For as little as'}</p>
          <p className="text-3xl font-bold">{usd.format(pkg.price)}</p>
          <p className="text-sm text-muted-foreground">
            {isPhysical
              ? <>{pkg.quantity} print-ready QR {codeWord}</>
              : <>{pkg.quantity} QR {pkg.quantity === 1 ? 'Code' : 'Codes'} per package</>}
          </p>
        </div>

        {/* Amount */}
        <div className="mt-auto flex items-center gap-2 pt-2">
          <span className="text-sm font-medium whitespace-nowrap">Amount:</span>
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
          {isPending ? 'Processing…' : isPhysical ? 'Buy & start reselling' : 'Start Earning Now'}
        </Button>
      </CardFooter>
    </Card>
  )
}
