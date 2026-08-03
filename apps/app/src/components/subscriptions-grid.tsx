"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { Check } from "lucide-react"
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { changeSubscription, createCheckoutSession } from "@/actions/billing.actions"
import { allowsExtraPurchase } from "@/lib/plan-quotas"
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

function monthlyEquivalent(plan: { price: number; termLength: number; monthlyPrice?: number | null }) {
  if (plan.monthlyPrice != null) return plan.monthlyPrice
  return plan.termLength > 0 ? plan.price / plan.termLength : 0
}

function compareMonthly(
  a: { price: number; termLength: number; monthlyPrice?: number | null },
  b: { price: number; termLength: number; monthlyPrice?: number | null },
) {
  return monthlyEquivalent(a) - monthlyEquivalent(b)
}

export function SubscriptionsGrid({ subscriptions, activePlan, flashStatus }: Props) {
  const t = useTranslations("Subscriptions")
  const [pendingChange, setPendingChange] = useState<PendingChange | null>(null)

  useEffect(() => {
    if (flashStatus === "success") {
      toast.success(t("toasts.paymentReceived"))
    } else if (flashStatus === "cancel") {
      toast.info(t("toasts.checkoutCanceled"))
    }
  }, [flashStatus, t])

  const activeSubscriptionId = activePlan?.subscription.id ?? null

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
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

interface PlanCardProps {
  plan:            SubscriptionRow
  delay:           number
  isActive:        boolean
  activePlan:      ActivePlan | null
  onRequestChange: (change: PendingChange) => void
}

function PlanCard({ plan, delay, isActive, activePlan, onRequestChange }: PlanCardProps) {
  const router = useRouter()
  const t = useTranslations("Subscriptions")
  const [isPending, startTransition] = useTransition()
  const isFree = plan.code === "FREE"
  const [selectedCadence, setSelectedCadence] = useState<"annual" | "monthly">("annual")

  const annualPrice = Number(plan.price)
  const monthlyPrice = monthlyEquivalent(plan)

  // Active plan shows what the user is actually paying, not the local toggle.
  const activeCadence = (activePlan?.cadence as "annual" | "monthly" | null) ?? "annual"
  const displayCadence = isActive ? activeCadence : selectedCadence
  const displayPrice = displayCadence === "annual" ? annualPrice : monthlyPrice

  const startFirstSubscription = (cadence: "annual" | "monthly") => {
    startTransition(async () => {
      const result = await createCheckoutSession(plan.id, cadence)
      if (!result.ok) { toast.error(result.message); return }
      router.push(result.data!.url)
    })
  }

  const requestChange = (cadence: "annual" | "monthly") => {
    if (!activePlan) {
      startFirstSubscription(cadence)
      return
    }
    const cmp = compareMonthly(plan, activePlan.subscription)
    const effect: "upgrade" | "downgrade" = cmp >= 0 ? "upgrade" : "downgrade"
    onRequestChange({ plan, cadence, effect })
  }

  const q = plan.quotas
  const features = [
    t("features.treeMembers", { count: q.treeMaxMembers }),
    t("features.bioChars", { count: q.bioMaxChars }),
    t("features.documents", { count: q.documentsMax }),
    t("features.mediaImages", { count: q.mediaMaxImages }),
    t("features.mediaVideos", { count: q.mediaMaxVideos }),
    t("features.geoPlaces", { count: q.geoPlacesMax }),
    ...(allowsExtraPurchase("geoPlacesMax") ? [t("features.geoPlacesExtra")] : []),
    t("features.memorials", { count: q.memorialsMax }),
    ...(allowsExtraPurchase("memorialsMax") ? [t("features.memorialsExtra")] : []),
    t("features.qrCodeCount", { count: q.qrCodeMax }),
    ...(allowsExtraPurchase("qrCodeMax") ? [t("features.qrExtra")] : []),
    ...(q.petsMax > 0 ? [t("features.petsCount", { count: q.petsMax })] : []),
  ]

  return (
    <div className="glass-card no-sheen p-6 flex flex-col gap-5 animate-fade-in" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center gap-2">
        <h3 className="text-2xl font-semibold tracking-tight">{plan.name}</h3>
        {isActive && (
          <span className="text-[10px] font-semibold uppercase tracking-wider rounded-full bg-primary text-primary-foreground px-2 py-0.5">
            {t("activeBadge")}
          </span>
        )}
      </div>

      {!isFree && !isActive && (
        <Tabs value={selectedCadence} onValueChange={(v) => setSelectedCadence(v as "annual" | "monthly")}>
          <TabsList className="w-full">
            <TabsTrigger value="monthly" className="flex-1">{t("tabs.monthly")}</TabsTrigger>
            <TabsTrigger value="annual" className="flex-1">{t("tabs.yearly")}</TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      <div className="space-y-1.5">
        {!isFree ? (
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold">{usd.format(displayPrice)}</span>
            <span className="text-sm text-muted-foreground">
              {displayCadence === "annual"
                ? (plan.termLength === 12 ? t("term.perYear") : plan.termLength === 0 ? t("term.perLifetime") : t("term.perMonths", { count: plan.termLength }))
                : t("term.perMonth")}
            </span>
          </div>
        ) : (
          <div>
            <span className="text-4xl font-bold">{t("freePrice")}</span>
          </div>
        )}
        {!isFree && displayCadence === "annual" && (
          <span className="inline-block text-[10px] font-semibold uppercase tracking-wider rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 dark:bg-amber-950 dark:text-amber-300">
            {t("bestValue")}
          </span>
        )}
      </div>

      <ul className="space-y-2 flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm">
            <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      {!isFree && !isActive && (
        <Button onClick={() => requestChange(selectedCadence)} disabled={isPending} className="w-full">
          {usd.format(displayPrice)}
        </Button>
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
  const t = useTranslations("Subscriptions")
  const tc = useTranslations("Common")
  const [isPending, startTransition] = useTransition()

  if (!pending || !activePlan) return null

  const isUpgrade = pending.effect === "upgrade"
  const cadenceLabel = pending.cadence === "annual" ? t("cadence.annual") : t("cadence.monthly")
  const periodEnd = longDate.format(activePlan.currentPeriodEnd)

  const title = isUpgrade ? t("confirm.upgradeTitle") : t("confirm.downgradeTitle")
  const description = isUpgrade
    ? t("confirm.upgradeDescription", { plan: pending.plan.name, cadence: cadenceLabel })
    : t("confirm.downgradeDescription", { currentPlan: activePlan.subscription.name, periodEnd, plan: pending.plan.name, cadence: cadenceLabel })
  const confirmLabel = isUpgrade ? t("confirm.upgradeAction") : t("confirm.downgradeAction")

  const handleConfirm = () => {
    startTransition(async () => {
      const result = await changeSubscription(pending.plan.id, pending.cadence)
      if (!result.ok) { toast.error(result.message); return }
      toast.success(
        result.data!.effect === "upgraded"
          ? t("toasts.switched", { plan: pending.plan.name })
          : t("toasts.scheduled", { plan: pending.plan.name, periodEnd }),
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
          <AlertDialogCancel disabled={isPending}>{tc("cancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={isPending}>
            {isPending ? t("confirm.working") : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
