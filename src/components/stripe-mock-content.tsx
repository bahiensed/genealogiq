'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CreditCard, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { purchasePackage } from '@/actions/purchase.actions'

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

interface Props {
  packageId:          string
  packageName:        string
  packageDescription: string | null
  qrPerPackage:       number
  quantity:           number
  unitPrice:          number
  total:              number
  returnTo:           string
}

export function StripeMockContent({
  packageId, packageName, packageDescription, qrPerPackage,
  quantity, unitPrice, total, returnTo,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const totalQr = qrPerPackage * quantity

  const handleComplete = () => {
    startTransition(async () => {
      const result = await purchasePackage(packageId, quantity)
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      toast.success(result.success)
      router.push(returnTo)
    })
  }

  const handleCancel = () => {
    router.push(returnTo)
  }

  return (
    <div className="mx-auto max-w-2xl py-12">
      <div className="mb-6 flex items-center gap-2 text-muted-foreground">
        <Lock className="h-3.5 w-3.5" />
        <span className="text-xs uppercase tracking-wider font-medium">Stripe Checkout (mock)</span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{packageName}</CardTitle>
          {packageDescription && <CardDescription>{packageDescription}</CardDescription>}
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {qrPerPackage} QR {qrPerPackage === 1 ? 'Code' : 'Codes'} × {quantity}
              </span>
              <span>{usd.format(unitPrice * quantity)}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between font-semibold">
              <span>Total ({totalQr} QR {totalQr === 1 ? 'Code' : 'Codes'})</span>
              <span className="text-lg">{usd.format(total)}</span>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <span>Card details</span>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground" htmlFor="mock-card">Card number</Label>
              <Input id="mock-card" placeholder="4242 4242 4242 4242" disabled />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground" htmlFor="mock-exp">Expiry</Label>
                <Input id="mock-exp" placeholder="12 / 30" disabled />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground" htmlFor="mock-cvc">CVC</Label>
                <Input id="mock-cvc" placeholder="123" disabled />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              This is a placeholder checkout. No payment is processed; clicking Complete creates the Sale directly.
            </p>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={handleCancel} disabled={isPending}>Cancel</Button>
          <Button onClick={handleComplete} disabled={isPending}>
            {isPending ? 'Processing…' : `Complete (mock) — ${usd.format(total)}`}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
