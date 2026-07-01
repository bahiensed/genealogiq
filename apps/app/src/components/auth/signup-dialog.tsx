'use client'

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
// can close to keep browsing — used for the gallery and the favorite (heart) action.
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
        className="sm:max-w-md gap-6 p-8"
      >
        <DialogHeader className="gap-4 text-center sm:text-center">
          <Image src="/tree-dark.png" alt="Genealogiq" width={256} height={256} className="mx-auto block dark:hidden h-24 w-24 object-contain" priority />
          <Image src="/tree-light.png" alt="Genealogiq" width={256} height={256} className="mx-auto hidden dark:block h-24 w-24 object-contain" priority />
          <DialogTitle className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0">
            {t("signupWallTitle")}
          </DialogTitle>
          <DialogDescription className="text-base">{t("signupWallDescription")}</DialogDescription>
        </DialogHeader>
        {/* Stacked, equal full-width CTAs (identical width in every locale). */}
        <div className="flex flex-col gap-2">
          <Button asChild size="lg" className="w-full rounded-full">
            <Link href={`/sign-in?callbackUrl=${callback}`}>{tNav("logIn")}</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="w-full rounded-full">
            <Link href={`/sign-up?callbackUrl=${callback}`}>{tNav("signUp")}</Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
