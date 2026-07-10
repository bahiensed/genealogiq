"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { BellRing } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { usePushSubscription } from "@/hooks/use-push-subscription"
import {
  getBannerDismissedRaw,
  isDismissedWithinCooldown,
  markBannerDismissed,
} from "@/lib/push-client"

// Invites the user to enable web push for this device, rendered at the top of
// /messages (the one place they're already thinking about notifications).
// Permission is only ever requested behind the Enable click — never on load.
// "Not now" hides it for 30 days; once subscribed it collapses into a muted
// row with a Disable affordance (v1 manages the current device only).
export function PushBanner() {
  const t = useTranslations("Push")
  const { state, subscribe, unsubscribe } = usePushSubscription()
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    setDismissed(isDismissedWithinCooldown(getBannerDismissedRaw(), Date.now()))
  }, [])

  if (state === "loading" || state === "unsupported" || state === "denied") return null

  if (state === "subscribed") {
    return (
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <BellRing aria-hidden className="h-3.5 w-3.5" />
          {t("enabled")}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-muted-foreground"
          onClick={async () => {
            const ok = await unsubscribe()
            if (!ok) toast.error(t("error"))
          }}
        >
          {t("disable")}
        </Button>
      </div>
    )
  }

  if (dismissed) return null

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <BellRing aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">{t("title")}</p>
            <p className="text-sm text-muted-foreground">{t("description")}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              markBannerDismissed()
              setDismissed(true)
            }}
          >
            {t("notNow")}
          </Button>
          <Button
            size="sm"
            disabled={state === "subscribing"}
            onClick={async () => {
              const ok = await subscribe()
              if (!ok && Notification.permission !== "denied") toast.error(t("error"))
            }}
          >
            {t("enable")}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
