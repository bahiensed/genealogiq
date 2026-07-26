"use client"

import { useTransition } from "react"
import { QrCode } from "lucide-react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { markPlaceQrGenerated } from "@/actions/places.actions"

interface Props {
  profileId: string
  placeId: string
}

// Lives in the page header, next to Edit. The generated code itself renders
// separately, in PlaceQrDisplay further down the page — the two are only
// connected through place.qrGenerated (persisted server-side): once this
// flips it, revalidatePath swaps this trigger out for the display on the
// next render. Not gated to isOwn — the QR button has always been open to
// any viewer, not just the owner.
export function PlaceQrTrigger({ profileId, placeId }: Props) {
  const t = useTranslations("Places")
  const [isPending, startTransition] = useTransition()

  const handleClick = () => {
    startTransition(async () => {
      const result = await markPlaceQrGenerated(profileId, placeId)
      if (!result.ok) toast.error(result.message)
    })
  }

  return (
    <Button type="button" variant="outline" className="gap-1.5" disabled={isPending} onClick={handleClick}>
      <QrCode className="h-4 w-4" />
      <span className="sr-only md:not-sr-only">{t("qrButton")}</span>
    </Button>
  )
}
