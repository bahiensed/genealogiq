"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { Settings } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { createPortalSession } from "@/actions/billing"

export function ManageSubscriptionButton() {
  const router = useRouter()
  const t = useTranslations("Subscriptions")
  const [isPending, startTransition] = useTransition()

  const handle = () => {
    startTransition(async () => {
      const result = await createPortalSession()
      if (!result.ok) { toast.error(result.message); return }
      router.push(result.data!.url)
    })
  }

  return (
    <Button className="shrink-0 gap-2" onClick={handle} disabled={isPending}>
      <Settings className="h-4 w-4" />
      {isPending ? t("opening") : t("manageSubscription")}
    </Button>
  )
}
