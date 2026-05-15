"use client"

import { useEffect, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Check, Sparkles, Settings } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { createCheckoutSession, createPortalSession } from "@/actions/billing"
import type { SubscriptionRow } from "@/queries/subscriptions"
import type { ActivePlan } from "@/queries/billing"

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })

interface Props {
  subscriptions: SubscriptionRow[]
  activePlan:    ActivePlan | null
  flashStatus?:  "success" | "cancel" | null
}

export function PlansGrid({ subscriptions, activePlan, flashStatus }: Props) {
  useEffect(() => {
    if (flashStatus === "success") {
      toast.success("Payment received — your plan is being activated. Refresh in a moment if it hasn't appeared yet.")
    } else if (flashStatus === "cancel") {
      toast.info("Checkout canceled.")
    }
  }, [flashStatus])

  return (
    <div className="space-y-6">
      {activePlan && <ActivePlanBanner plan={activePlan} />}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {subscriptions.map((s, i) => (
          <PlanCard key={s.id} plan={s} delay={i * 60} isActiveTier={activePlan?.subscription.id === s.id} />
        ))}
      </div>
    </div>
  )
}

function ActivePlanBanner({ plan }: { plan: ActivePlan }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const renews = plan.currentPeriodEnd.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
  const summary = plan.cancelAtPeriodEnd
    ? `Currently on ${plan.subscription.name} — ${plan.cadence} cadence, ends ${renews}.`
    : `Currently on ${plan.subscription.name} — ${plan.cadence} cadence, renews ${renews}.`

  const handleManage = () => {
    startTransition(async () => {
      const result = await createPortalSession()
      if ("error" in result) { toast.error(result.error); return }
      router.push(result.url)
    })
  }

  return (
    <div className="glass-card no-sheen px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
      <p className="text-sm text-foreground/90">{summary}</p>
      <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={handleManage} disabled={isPending}>
        <Settings className="h-3.5 w-3.5" />
        {isPending ? "Opening…" : "Manage subscription"}
      </Button>
    </div>
  )
}

function PlanCard({ plan, delay, isActiveTier }: { plan: SubscriptionRow; delay: number; isActiveTier: boolean }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const isFree = plan.code === "FREE"

  const choose = (cadence: "annual" | "monthly") => {
    startTransition(async () => {
      const result = await createCheckoutSession(plan.id, cadence)
      if ("error" in result) { toast.error(result.error); return }
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

  const monthlyEquivalent = plan.termLength > 0 ? Number(plan.price) / plan.termLength : 0

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
          {isActiveTier && (
            <span className="text-[10px] font-semibold uppercase tracking-wider rounded-full bg-primary text-primary-foreground px-2 py-0.5">
              Active
            </span>
          )}
        </div>
        {plan.description && (
          <p className="text-sm text-muted-foreground leading-snug">{plan.description}</p>
        )}
      </div>

      {!isFree && (
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold">{usd.format(Number(plan.price))}</span>
          <span className="text-sm text-muted-foreground">
            {plan.termLength === 12 ? "/ year" : plan.termLength === 0 ? "/ lifetime" : `/ ${plan.termLength} mo`}
          </span>
        </div>
      )}
      {isFree && (
        <div>
          <span className="text-4xl font-bold">Free</span>
        </div>
      )}

      <ul className="space-y-2 flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm">
            <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      {isFree ? (
        <Button variant="outline" disabled className="w-full">Your default plan</Button>
      ) : (
        <div className="grid grid-cols-1 gap-2">
          <Button onClick={() => choose("annual")} disabled={isPending} className="w-full gap-2">
            <Sparkles className="h-4 w-4" />
            Pay annually — {usd.format(Number(plan.price))}
          </Button>
          <Button onClick={() => choose("monthly")} disabled={isPending} variant="outline" className="w-full">
            Pay monthly — {usd.format(monthlyEquivalent)} / mo
          </Button>
        </div>
      )}
    </div>
  )
}
