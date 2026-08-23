import { notFound, redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { auth } from "@/auth"
import { getLicenseByGenCode } from "@/queries/gencode"
import { GenCodeLanding } from "@/components/qr/gencode-landing"
import { ActivateMemorialForm } from "@/components/qr/activate-memorial-form"
import { AuroraBackdrop } from "@/components/aurora-backdrop"

interface Props {
  params: Promise<{ genCode: string }>
}

export default async function GenCodePage({ params }: Props) {
  const { genCode: rawGenCode } = await params
  const normalized = rawGenCode.toUpperCase().replace(/-/g, "")

  const [session, license, t] = await Promise.all([
    auth(),
    getLicenseByGenCode(normalized),
    getTranslations("Qr"),
  ])

  if (!license) notFound()

  if (license.status === "ACTIVATED") {
    redirect(`/profile/${license.appUserId}`)
  }

  // AVAILABLE
  return (
    <div className="min-h-screen relative overflow-x-hidden">
      <AuroraBackdrop variant="page" intensity="bold" />
      <main className="container relative z-10 pt-24 pb-32">
        {session?.user ? (
          <div className="space-y-6">
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight">{t("activatePage.title")}</h1>
              <p className="text-muted-foreground mt-2">
                {t("activatePage.subtitle")}
              </p>
            </div>
            <ActivateMemorialForm genCode={normalized} />
          </div>
        ) : (
          <GenCodeLanding genCode={normalized} />
        )}
      </main>
    </div>
  )
}
