'use client'

import { useEffect, useState } from "react"
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

// Soft sign-up nudge for anonymous visitors on the long memorial content pages
// (bio / gallery / tributes). Renders nothing until the visitor scrolls into the
// second fold, then a modal Dialog pops up OVER the intact page — not an inline card,
// no fade, no layout disruption. Fires once and is dismissible.
export function SignupPrompt() {
  const t = useTranslations("Auth")
  const pathname = usePathname()
  const callback = encodeURIComponent(pathname || "/")
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let fired = false
    const onScroll = () => {
      if (!fired && window.scrollY > window.innerHeight * 0.9) {
        fired = true
        setOpen(true)
        window.removeEventListener("scroll", onScroll)
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md text-center">
        <DialogHeader>
          <DialogTitle className="text-2xl tracking-tight">{t("signupWallTitle")}</DialogTitle>
          <DialogDescription>{t("signupWallDescription")}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-center gap-2 pt-2">
          <Button asChild variant="outline" className="rounded-full">
            <Link href={`/sign-in?callbackUrl=${callback}`}>{t("signIn")}</Link>
          </Button>
          <Button asChild className="rounded-full">
            <Link href={`/sign-up?callbackUrl=${callback}`}>{t("createAccount")}</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
