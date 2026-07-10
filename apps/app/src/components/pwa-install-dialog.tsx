"use client"

import { useTranslations } from "next-intl"
import { Share, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { usePwaInstall } from "@/hooks/use-pwa-install"

// Invites the visitor to install the app. Chromium browsers get a real
// Install button (beforeinstallprompt); iOS gets Add-to-Home-Screen
// instructions; browsers with neither render nothing. Declining (button,
// ESC or outside click) hides it for 21 days — see lib/pwa-install.ts.
export function PwaInstallDialog() {
  const t = useTranslations("InstallPrompt")
  const { mode, open, install, dismiss } = usePwaInstall()

  if (mode === null) return null

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) dismiss()
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        {mode === "ios" && (
          <ol className="list-decimal space-y-1 pl-5 text-sm">
            <li>
              {t("iosStep1")}{" "}
              <Share aria-hidden className="inline h-4 w-4 align-text-bottom text-muted-foreground" />
            </li>
            <li>{t("iosStep2")}</li>
            <li>{t("iosStep3")}</li>
          </ol>
        )}

        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <Info aria-hidden className="h-4 w-4 shrink-0" />
          {t("betaNotice")}
        </p>

        <DialogFooter>
          {mode === "native" ? (
            <>
              <Button variant="outline" onClick={dismiss}>
                {t("declineButton")}
              </Button>
              <Button onClick={install}>{t("installButton")}</Button>
            </>
          ) : (
            <Button onClick={dismiss}>{t("gotItButton")}</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
