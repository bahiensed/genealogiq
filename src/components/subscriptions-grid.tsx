"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Check, CalendarDays, Calendar1, Settings } from "lucide-react"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { changeSubscription, createCheckoutSession, createPortalSession } from "@/actions/billing"
import type { SubscriptionRow } from "@/queries/subscriptions"
import type { ActivePlan } from "@/queries/billing"

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })
const longDate = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" })

interface Props {
  subscriptions: SubscriptionRow[]
  activePlan:    ActivePlan | null
  flashStatus?:  "success" | "cancel" | null
}

type PendingChange = {
  plan:    SubscriptionRow
  cadence: "annual" | "monthly"
  effect:  "upgrade" | "downgrade"
}

function monthlyEquivalent(price: number, termLength: number) {
  return termLength > 0 ? price / termLength : 0
}

function compareMonthly(a: { price: number; termLength: number }, b: { price: number; termLength: number }) {
  return monthlyEquivalent(a.price, a.termLength) - monthlyEquivalent(b.price, b.termLength)
}

export function SubscriptionsGrid({ subscriptions, activePlan, flashStatus }: Props) {
  const [pendingChange, setPendingChange] = useState<PendingChange | null>(null)

  useEffect(() => {
    if (flashStatus === "success") {
      toast.success("Payment received — your plan is being activated. Refresh in a moment if it hasn't appeared yet.")
    } else if (flashStatus === "cancel") {
      toast.info("Checkout canceled.")
    }
  }, [flashStatus])

  const activeSubscriptionId = activePlan?.subscription.id ?? null

  return (
    <div className="space-y-6">
      {activePlan && <ActivePlanBanner plan={activePlan} />}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {subscriptions.map((s, i) => {
          const isActive = activeSubscriptionId
            ? activeSubscriptionId === s.id
            : s.code === "FREE"
          return (
            <PlanCard
              key={s.id}
              plan={s}
              delay={i * 60}
              isActive={isActive}
              activePlan={activePlan}
              onRequestChange={setPendingChange}
            />
          )
        })}
      </div>

      <ChangeConfirmDialog
        pending={pendingChange}
        activePlan={activePlan}
        onClose={() => setPendingChange(null)}
      />
    </div>
  )
}

function ActivePlanBanner({ plan }: { plan: ActivePlan }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const summary = `Currently on ${plan.subscription.name} until ${longDate.format(plan.currentPeriodEnd)}.`

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

interface PlanCardProps {
  plan:            SubscriptionRow
  delay:           number
  isActive:        boolean
  activePlan:      ActivePlan | null
  onRequestChange: (change: PendingChange) => void
}

function PlanCard({ plan, delay, isActive, activePlan, onRequestChange }: PlanCardProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const isFree = plan.code === "FREE"

  const annualPrice  = Number(plan.price)
  const monthlyPrice = monthlyEquivalent(annualPrice, plan.termLength)

  const startFirstSubscription = (cadence: "annual" | "monthly") => {
    startTransition(async () => {
      const result = await createCheckoutSession(plan.id, cadence)
      if ("error" in result) { toast.error(result.error); return }
      router.push(result.url)
    })
  }

  const requestChange = (cadence: "annual" | "monthly") => {
    if (!activePlan) {
      startFirstSubscription(cadence)
      return
    }
    const cmp = compareMonthly(
      { price: annualPrice, termLength: plan.termLength },
      { price: activePlan.subscription.price, termLength: activePlan.subscription.termLength },
    )
    const effect: "upgrade" | "downgrade" = cmp >= 0 ? "upgrade" : "downgrade"
    onRequestChange({ plan, cadence, effect })
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
          {isActive && (
            <span className="text-[10px] font-semibold uppercase tracking-wider rounded-full bg-primary text-primary-foreground px-2 py-0.5">
              Active
            </span>
          )}
        </div>
        {plan.description && (
          <p className="text-sm text-muted-foreground leading-snug">{plan.description}</p>
        )}
      </div>

      {!isFree ? (
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold">{usd.format(annualPrice)}</span>
          <span className="text-sm text-muted-foreground">
            {plan.termLength === 12 ? "/ year" : plan.termLength === 0 ? "/ lifetime" : `/ ${plan.termLength} mo`}
          </span>
        </div>
      ) : (
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

      {!isFree && !isActive && (
        <div className="grid grid-cols-1 gap-2">
          <Button onClick={() => requestChange("annual")} disabled={isPending} className="w-full gap-2">
            <CalendarDays className="h-4 w-4" />
            Pay annually {usd.format(annualPrice)}
          </Button>
          <Button onClick={() => requestChange("monthly")} disabled={isPending} variant="outline" className="w-full gap-2">
            <Calendar1 className="h-4 w-4" />
            Pay monthly {usd.format(monthlyPrice)}
          </Button>
        </div>
      )}
    </div>
  )
}

interface ChangeConfirmDialogProps {
  pending:    PendingChange | null
  activePlan: ActivePlan | null
  onClose:    () => void
}

function ChangeConfirmDialog({ pending, activePlan, onClose }: ChangeConfirmDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  if (!pending || !activePlan) return null

  const isUpgrade = pending.effect === "upgrade"
  const cadenceLabel = pending.cadence === "annual" ? "annual" : "monthly"
  const periodEnd = longDate.format(activePlan.currentPeriodEnd)

  const title = isUpgrade ? "Upgrade now?" : "Schedule downgrade?"
  const description = isUpgrade
    ? `You'll switch to ${pending.plan.name} (${cadenceLabel}) immediately. Stripe will charge the prorated difference today and the new features unlock right away.`
    : `Your ${activePlan.subscription.name} plan stays active until ${periodEnd}. After that, ${pending.plan.name} (${cadenceLabel}) kicks in with no charge today.`
  const confirmLabel = isUpgrade ? "Upgrade now" : "Schedule switch"

  const handleConfirm = () => {
    startTransition(async () => {
      const result = await changeSubscription(pending.plan.id, pending.cadence)
      if ("error" in result) { toast.error(result.error); return }
      toast.success(
        result.effect === "upgraded"
          ? `Switched to ${pending.plan.name}. Stripe just charged the prorated amount.`
          : `${pending.plan.name} is scheduled to start on ${periodEnd}.`,
      )
      onClose()
      router.refresh()
    })
  }

  return (
    <AlertDialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={isPending}>
            {isPending ? "Working…" : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
