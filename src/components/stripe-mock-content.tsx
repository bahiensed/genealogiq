"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { CreditCard, Lock } from "lucide-react"
import { AuroraBackdrop } from "@/components/aurora-backdrop"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { purchaseSubscription } from "@/actions/checkout"

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })

interface Props {
  subscriptionId:    string
  planName:          string
  planDescription:   string | null
  price:             number
  termLength:        number
  memorialSlots:     number
  bioMaxChars:       number
  bioMaxImages:      number
  galleryMaxImages:  number
  galleryMaxVideos:  number
  returnTo:          string
}

export function StripeMockContent({
  subscriptionId, planName, planDescription, price, termLength,
  memorialSlots, bioMaxChars, bioMaxImages, galleryMaxImages, galleryMaxVideos, returnTo,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleComplete = () => {
    startTransition(async () => {
      const result = await purchaseSubscription(subscriptionId)
      if ("error" in result) {
        toast.error(result.error)
        return
      }
      toast.success(result.success)
      router.push(returnTo)
    })
  }

  const handleCancel = () => router.push(returnTo)

  const term = termLength === 0 ? "lifetime" : `${termLength} months`

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      <AuroraBackdrop variant="page" />

      <main className="container relative pt-24 pb-24 max-w-xl">
        <div className="mb-6 flex items-center gap-2 text-muted-foreground">
          <Lock className="h-3.5 w-3.5" />
          <span className="text-xs uppercase tracking-wider font-medium">Stripe Checkout (mock)</span>
        </div>

        <div className="glass-card no-sheen p-6 md:p-8 space-y-6 animate-fade-in">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{planName}</h1>
            {planDescription && <p className="text-sm text-muted-foreground mt-1">{planDescription}</p>}
          </div>

          <div className="rounded-lg border border-border/60 p-4 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{planName} plan</span>
              <span className="font-medium">{usd.format(price)}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Billing</span>
              <span>{term}</span>
            </div>
            <div className="border-t border-border/60 my-2" />
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li>· {memorialSlots} memorial {memorialSlots === 1 ? "slot" : "slots"}</li>
              <li>· {bioMaxChars.toLocaleString()} biography characters · {bioMaxImages} biography images</li>
              <li>· {galleryMaxImages} gallery photos · {galleryMaxVideos} gallery videos</li>
            </ul>
            <div className="border-t border-border/60 my-2" />
            <div className="flex items-center justify-between font-semibold">
              <span>Total</span>
              <span className="text-lg">{usd.format(price)}</span>
            </div>
          </div>

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
              This is a placeholder checkout. No payment is processed; clicking Complete activates the plan directly.
            </p>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end pt-2 border-t border-border/60">
            <Button variant="outline" onClick={handleCancel} disabled={isPending}>Cancel</Button>
            <Button onClick={handleComplete} disabled={isPending}>
              {isPending ? "Processing…" : `Complete (mock) — ${usd.format(price)}`}
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
