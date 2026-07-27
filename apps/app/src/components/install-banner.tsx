"use client"

import Link from "next/link"
import { useTranslations } from "next-intl"
import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { GlassIcon } from "@/components/glass-icon"
import { useInstallBanner } from "@/hooks/use-install-banner"

// Deliberately independent of the floating popup's dismiss cooldown/opt-out
// (see hooks/use-install-banner.ts) — this banner has no decline button and
// keeps showing until the app is actually installed. Chromium/Android gets a
// real 1-tap Install button; iOS (no programmatic install exists) links to
// /install for the Share steps. PwaInstallDialog suppresses itself on /home
// so the two never compete for the same click.
export function InstallBanner() {
  const t = useTranslations("InstallPrompt")
  const { mode, open, install } = useInstallBanner()

  if (!open) return null

  return (
    <div className="glass-card no-sheen mb-8 flex flex-col gap-3 p-4 animate-fade-in sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <GlassIcon icon={Download} size="sm" />
        <div>
          <p className="text-sm font-semibold">{t("banner.title")}</p>
          <p className="text-sm text-muted-foreground">{t("banner.description")}</p>
        </div>
      </div>
      <div className="shrink-0 self-end sm:self-auto">
        {mode === "native" ? (
          <Button size="sm" onClick={() => void install()}>
            {t("installButton")}
          </Button>
        ) : (
          <Button size="sm" asChild>
            <Link href="/install">{t("banner.iosCta")}</Link>
          </Button>
        )}
      </div>
    </div>
  )
}
