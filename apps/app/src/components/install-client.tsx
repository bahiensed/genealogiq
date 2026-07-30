"use client"

import Image from "next/image"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { Download, Share, CircleCheck, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AuroraBackdrop } from "@/components/aurora-backdrop"
import { usePwaInstallPage } from "@/hooks/use-pwa-install-page"

export function InstallClient() {
  const t = useTranslations("InstallPrompt")
  const { status, install } = usePwaInstallPage()

  return (
    <div className="relative min-h-screen overflow-x-hidden flex flex-col items-center justify-center px-4 py-16 text-center">
      <AuroraBackdrop variant="page" intensity="bold" />

      <div className="relative glass-card no-sheen max-w-md w-full p-8 flex flex-col items-center gap-4 animate-fade-in">
        <div className="relative">
          <Image src="/icons/icon-192.png" alt="Genealogiq" width={80} height={80} className="rounded-2xl" priority />
          <div className="absolute -bottom-1.5 -right-1.5 rounded-full bg-background/90 p-1.5 ring-1 ring-border/60">
            {status === "checking" && (
              <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            )}
            {status === "installed" && <CircleCheck className="h-4 w-4 text-primary" />}
            {status === "already-installed" && <CircleCheck className="h-4 w-4 text-primary" />}
            {status === "native" && <Download className="h-4 w-4 text-primary" />}
            {status === "ios" && <Share className="h-4 w-4 text-primary" />}
            {status === "unsupported" && <Info className="h-4 w-4 text-primary" />}
          </div>
        </div>

        {status === "checking" && (
          <p className="text-sm text-muted-foreground">{t("page.checking")}</p>
        )}

        {status === "installed" && (
          <>
            <h1 className="text-xl font-semibold tracking-tight">{t("page.installedTitle")}</h1>
            <p className="text-sm text-muted-foreground">{t("page.installedMessage")}</p>
            <Button asChild className="mt-2 gap-2">
              <Link href="/home">{t("page.openAppButton")}</Link>
            </Button>
          </>
        )}

        {status === "already-installed" && (
          <>
            <h1 className="text-xl font-semibold tracking-tight">{t("page.alreadyInstalledTitle")}</h1>
            <p className="text-sm text-muted-foreground">{t("page.alreadyInstalledMessage")}</p>
            <Button asChild className="mt-2 gap-2">
              <Link href="/home">{t("page.openAppButton")}</Link>
            </Button>
          </>
        )}

        {status === "native" && (
          <>
            <h1 className="text-xl font-semibold tracking-tight">{t("title")}</h1>
            <p className="text-sm text-muted-foreground">{t("description")}</p>
            <Button onClick={() => void install()} className="mt-2 gap-2">
              <Download className="h-4 w-4" />
              {t("installButton")}
            </Button>
          </>
        )}

        {status === "ios" && (
          <>
            <h1 className="text-xl font-semibold tracking-tight">{t("title")}</h1>
            <p className="text-sm text-muted-foreground">{t("description")}</p>
            <ol className="list-decimal space-y-1.5 pl-5 text-sm text-left self-stretch">
              <li>
                {t("iosStep1")}{" "}
                <Share aria-hidden className="inline h-4 w-4 align-text-bottom text-muted-foreground" />
              </li>
              <li>{t("iosStep2")}</li>
              <li>{t("iosStep3")}</li>
            </ol>
          </>
        )}

        {status === "unsupported" && (
          <>
            <h1 className="text-xl font-semibold tracking-tight">{t("page.unsupportedTitle")}</h1>
            <p className="text-sm text-muted-foreground">{t("page.unsupportedMessage")}</p>
          </>
        )}
      </div>
    </div>
  )
}
