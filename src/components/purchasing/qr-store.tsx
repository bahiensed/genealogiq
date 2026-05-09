'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { ShoppingCart } from 'lucide-react'
import { purchasePackage } from '@/actions/purchase.actions'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'

export interface QRPackage {
  id: string
  name: string
  description: string | null
  price: number
  quantity: number
}

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

export function QRStore({ packages }: { packages: QRPackage[] }) {
  if (packages.length === 0) {
    return (
      <p className="text-muted-foreground">No packages available at the moment.</p>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {packages.map((pkg) => (
        <PackageCard key={pkg.id} pkg={pkg} />
      ))}
    </div>
  )
}

function PackageCard({ pkg }: { pkg: QRPackage }) {
  const [qty, setQty] = useState(1)
  const [isPending, startTransition] = useTransition()

  function handleBuy() {
    startTransition(async () => {
      const result = await purchasePackage(pkg.id, qty)
      if ('error' in result) {
        toast.error(result.error)
      } else {
        toast.success(result.success)
        setQty(1)
      }
    })
  }

  const totalPrice    = pkg.price * qty
  const revenueUpside = pkg.price * 5

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>{pkg.name}</CardTitle>
        <CardDescription>
          Package with {pkg.quantity} QR {pkg.quantity === 1 ? 'Code' : 'Codes'}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4">
        {/* Marketing copy */}
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-medium">
            Boost your margins by up to 500% with this bundle
          </p>
          <p className="text-sm text-muted-foreground">
            Generate {usd.format(revenueUpside)}+ in revenue
          </p>
        </div>

        <Separator />

        {/* Price */}
        <div>
          <p className="text-xs text-muted-foreground">For as little as</p>
          <p className="text-3xl font-bold">{usd.format(pkg.price)}</p>
          <p className="text-sm text-muted-foreground">
            {pkg.quantity} QR {pkg.quantity === 1 ? 'Code' : 'Codes'} per package
          </p>
        </div>

        {/* Qty + Amount */}
        <div className="mt-auto flex items-center gap-2 pt-2">
          <span className="text-sm font-medium whitespace-nowrap">Qty. packages</span>
          <Input
            type="number"
            min={1}
            value={qty}
            onChange={(e) => setQty(Math.max(1, Math.trunc(Number(e.target.value))))}
            className="w-20"
          />
          <span className="text-muted-foreground">→</span>
          <span className="text-sm font-medium whitespace-nowrap">Amount:</span>
          <span className="text-sm font-semibold tabular-nums">{usd.format(totalPrice)}</span>
        </div>
      </CardContent>

      <CardFooter className="border-t">
        <Button className="w-full" onClick={handleBuy} disabled={isPending}>
          <ShoppingCart className="mr-2 h-4 w-4" />
          {isPending ? 'Processing…' : 'Start Earning Now'}
        </Button>
      </CardFooter>
    </Card>
  )
}
