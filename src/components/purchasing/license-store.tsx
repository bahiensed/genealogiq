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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export interface LicensePackage {
  id: string
  name: string
  description: string | null
  price: number
  quantity: number
  license: {
    component: string
    description: string | null
  }
}

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

export function LicenseStore({ packages }: { packages: LicensePackage[] }) {
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

function PackageCard({ pkg }: { pkg: LicensePackage }) {
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

  const totalLicenses = pkg.quantity * qty
  const totalPrice = pkg.price * qty

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle>{pkg.name}</CardTitle>
          <Badge variant="secondary" className="shrink-0">{pkg.license.component}</Badge>
        </div>
        {pkg.description && (
          <CardDescription>{pkg.description}</CardDescription>
        )}
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4">
        <div>
          <p className="text-3xl font-bold">{usd.format(pkg.price)}</p>
          <p className="text-sm text-muted-foreground">
            {pkg.quantity} {pkg.quantity === 1 ? 'license' : 'licenses'} per package
          </p>
        </div>

        {pkg.license.description && (
          <p className="border-t pt-3 text-sm text-muted-foreground">
            {pkg.license.description}
          </p>
        )}

        <div className="mt-auto flex items-center gap-3 pt-2">
          <label className="text-sm font-medium whitespace-nowrap">Qty. packages</label>
          <Input
            type="number"
            min={1}
            value={qty}
            onChange={(e) => setQty(Math.max(1, Math.trunc(Number(e.target.value))))}
            className="w-20"
          />
        </div>

        {qty > 1 && (
          <p className="text-sm text-muted-foreground">
            {totalLicenses} licenses · {usd.format(totalPrice)}
          </p>
        )}
      </CardContent>

      <CardFooter className="border-t">
        <Button className="w-full" onClick={handleBuy} disabled={isPending}>
          <ShoppingCart className="mr-2 h-4 w-4" />
          {isPending ? 'Processing…' : 'Buy'}
        </Button>
      </CardFooter>
    </Card>
  )
}
