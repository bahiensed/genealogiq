"use client"

import { useTranslations } from "next-intl"
import { Share } from "lucide-react"
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
import { usePwaInstall } from "@/hooks/use-pwa-install"

// Invites the visitor to install the app. Chromium browsers get a real
// Install button (beforeinstallprompt); iOS gets Add-to-Home-Screen
// instructions; browsers with neither render nothing. Declining ("Agora
// não" or ESC) hides it for 21 days — see lib/pwa-install.ts. An
// AlertDialog (no X button, no outside-click close) keeps the choice
// explicit: accidental outside clicks don't burn the 21-day cooldown.
export function PwaInstallDialog() {
  const t = useTranslations("InstallPrompt")
  const { mode, open, install, dismiss } = usePwaInstall()

  if (mode === null) return null

  return (
    <AlertDialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) dismiss()
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title")}</AlertDialogTitle>
          <AlertDialogDescription>{t("description")}</AlertDialogDescription>
        </AlertDialogHeader>

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

        <div className="flex flex-col gap-1">
          <small className="text-sm leading-none font-medium">{t("betaTitle")}</small>
          <small className="text-sm text-muted-foreground">{t("betaNote")}</small>
        </div>

        <AlertDialogFooter>
          {mode === "native" ? (
            <>
              <AlertDialogCancel>{t("declineButton")}</AlertDialogCancel>
              {/* preventDefault keeps Radix from closing (and onOpenChange
                  from marking the 21-day decline) — install() closes after
                  the browser prompt resolves. */}
              <AlertDialogAction
                onClick={(event) => {
                  event.preventDefault()
                  void install()
                }}
              >
                {t("installButton")}
              </AlertDialogAction>
            </>
          ) : (
            <AlertDialogAction>{t("gotItButton")}</AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
