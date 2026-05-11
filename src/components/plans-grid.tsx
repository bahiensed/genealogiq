"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Check, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { createSubscriptionCheckoutSession } from "@/actions/checkout"
import type { SubscriptionRow } from "@/queries/subscriptions"

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })

interface Props {
  subscriptions: SubscriptionRow[]
}

export function PlansGrid({ subscriptions }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {subscriptions.map((s, i) => (
        <PlanCard key={s.id} plan={s} delay={i * 60} />
      ))}
    </div>
  )
}

function PlanCard({ plan, delay }: { plan: SubscriptionRow; delay: number }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const isFree = plan.code === "FREE"

  const handleChoose = () => {
    startTransition(async () => {
      const result = await createSubscriptionCheckoutSession(plan.id)
      if ("error" in result) {
        toast.error(result.error)
        return
      }
      router.push(result.url)
    })
  }

  const features = [
    `${plan.maxProfiles} memorial ${plan.maxProfiles === 1 ? "slot" : "slots"} per purchase`,
    `${plan.treeMaxMembers} family tree members`,
    `${plan.bioMaxChars.toLocaleString()} biography characters`,
    `${plan.bioMaxImages} biography images`,
    `${plan.galleryMaxImages} gallery photos`,
    `${plan.galleryMaxVideos} gallery videos`,
    plan.geolocationFullAccess ? "Precise GPS coordinates" : "Address only (no GPS pin)",
    plan.qrCodeAccess ? "QR Code for plaques & stones" : "QR Code on paid plans",
  ]

  return (
    <div className="glass-card no-sheen p-6 flex flex-col gap-5 animate-fade-in" style={{ animationDelay: `${delay}ms` }}>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <h3 className="text-2xl font-semibold tracking-tight">{plan.name}</h3>
          {isFree && (
            <span className="text-[10px] font-semibold uppercase tracking-wider rounded-full bg-secondary text-foreground/80 px-2 py-0.5">
              Default
            </span>
          )}
        </div>
        {plan.description && (
          <p className="text-sm text-muted-foreground leading-snug">{plan.description}</p>
        )}
      </div>

      <div>
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold">{isFree ? "Free" : usd.format(plan.price)}</span>
          {!isFree && plan.termLength > 0 && (
            <span className="text-sm text-muted-foreground">/ {plan.termLength} mo</span>
          )}
          {!isFree && plan.termLength === 0 && (
            <span className="text-sm text-muted-foreground">/ lifetime</span>
          )}
        </div>
      </div>

      <ul className="space-y-2 flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm">
            <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      {isFree ? (
        <Button variant="outline" disabled className="w-full">
          Your default plan
        </Button>
      ) : (
        <Button onClick={handleChoose} disabled={isPending} className="w-full gap-2">
          <Sparkles className="h-4 w-4" />
          {isPending ? "Redirecting…" : "Choose plan"}
        </Button>
      )}
    </div>
  )
}
