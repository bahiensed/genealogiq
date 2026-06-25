import Link from "next/link"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { Lock, QrCode } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AuroraBackdrop } from "@/components/aurora-backdrop"
import { BackButton } from "@/components/back-button"
import { QrCodeClient } from "@/components/qr-code-client"
import { verifySession } from "@/lib/dal"
import { getProfileById } from "@/queries/profile"

interface Props {
  params: Promise<{ id: string }>
}

export default async function QrCodePage({ params }: Props) {
  const { id } = await params
  const session = await verifySession()
  const t = await getTranslations("Qr")

  const profile = await getProfileById(id)
  if (!profile) notFound()

  const isFreeMemorial = profile.role === "APP_MEMO" && profile.appSaleId == null && profile.physicalQrLicense == null
  const isGuardian = profile.role === "APP_MEMO" && profile.guardedBy.some((g) => g.guardianId === session.user.id)

  const appUrl = process.env.APP_URL ?? "https://genealogiq.app"
  const profileUrl = `${appUrl}/profile/${id}`

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      <AuroraBackdrop variant="page" intensity="bold" />

      <main className="container relative pt-24 pb-32 max-w-6xl">
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 md:gap-4 min-w-0">
              <BackButton href={`/profile/${id}`} label={t("profilePage.backToProfile")} />
              <h1 className="text-4xl md:text-5xl font-semibold tracking-tight whitespace-nowrap">{t("profilePage.title")}</h1>
            </div>
          </div>
          <p className="text-muted-foreground mt-2 italic">
            {t("profilePage.subtitle")}
          </p>
        </div>

        {isFreeMemorial && isGuardian ? (
          <div className="glass-card flex flex-col items-center justify-center gap-4 py-20 text-center animate-fade-in">
            <div className="relative">
              <QrCode className="h-12 w-12 text-muted-foreground" />
              <div className="absolute -bottom-1 -right-1 rounded-full bg-background/90 p-1 ring-1 ring-border/60">
                <Lock className="h-4 w-4 text-primary" />
              </div>
            </div>
            <h2 className="text-xl font-semibold tracking-tight mt-2">{t("profilePage.unlockTitle")}</h2>
            <p className="text-muted-foreground max-w-md text-sm">
              {t("profilePage.unlockDescription")}
            </p>
            <Button asChild className="mt-2 gap-2">
              <Link href="/billing/qr-code">{t("profilePage.purchase")}</Link>
            </Button>
          </div>
        ) : isFreeMemorial ? (
          <div className="glass-card no-sheen flex flex-col items-center justify-center gap-3 py-20 text-center animate-fade-in">
            <QrCode className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground text-sm">{t("profilePage.noQrYet")}</p>
          </div>
        ) : (
          <QrCodeClient profileUrl={profileUrl} />
        )}
      </main>
    </div>
  )
}
