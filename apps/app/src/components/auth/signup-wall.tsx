'use client'

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"

// Instagram-style "wall" appended after the partial content an anonymous visitor is
// allowed to preview. The gradient fades the cut-off content above into the wall, then
// invites sign-in / sign-up, returning the visitor to the current page afterwards.
export function SignupWall() {
  const t = useTranslations("Auth")
  const pathname = usePathname()
  const callback = encodeURIComponent(pathname || "/")

  return (
    <section className="relative mt-8 animate-fade-in">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-40 h-40 bg-gradient-to-b from-transparent to-background"
      />
      <div className="glass-card-deep no-sheen relative text-center px-6 py-12 flex flex-col items-center gap-4">
        <h3 className="text-2xl font-semibold tracking-tight">{t("signupWallTitle")}</h3>
        <p className="text-sm text-muted-foreground max-w-md">{t("signupWallDescription")}</p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
          <Button asChild variant="outline" className="rounded-full">
            <Link href={`/sign-in?callbackUrl=${callback}`}>{t("signIn")}</Link>
          </Button>
          <Button asChild className="rounded-full">
            <Link href={`/sign-up?callbackUrl=${callback}`}>{t("createAccount")}</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
