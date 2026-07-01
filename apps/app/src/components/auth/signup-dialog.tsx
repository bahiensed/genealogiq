'use client'

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  dismissible?: boolean
}

// Shared sign-up wall dialog for anonymous visitors. `dismissible=false` makes it a
// hard content wall (no close button, ESC/outside-click disabled) — used for
// continuous content (bio, tributes). `dismissible=true` is a soft prompt the visitor
// can close to keep browsing the already-visible items — used for the gallery.
export function SignupDialog({ open, onOpenChange, dismissible = false }: Props) {
  const t = useTranslations("Auth")
  const tNav = useTranslations("Nav")
  const pathname = usePathname()
  const callback = encodeURIComponent(pathname || "/")

  const block = dismissible ? undefined : (e: Event) => e.preventDefault()

  return (
    <Dialog open={open} onOpenChange={dismissible ? onOpenChange : undefined}>
      <DialogContent
        showCloseButton={dismissible}
        onEscapeKeyDown={block}
        onInteractOutside={block}
        className="sm:max-w-lg gap-5 p-8 text-center"
      >
        <DialogHeader>
          <DialogTitle className="text-2xl md:text-3xl tracking-tight">{t("signupWallTitle")}</DialogTitle>
          <DialogDescription className="text-base">{t("signupWallDescription")}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-center gap-3 pt-2">
          <Button asChild variant="outline" size="lg" className="rounded-full">
            <Link href={`/sign-in?callbackUrl=${callback}`}>{tNav("logIn")}</Link>
          </Button>
          <Button asChild size="lg" className="rounded-full">
            <Link href={`/sign-up?callbackUrl=${callback}`}>{tNav("signUp")}</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
