import { getTranslations } from "next-intl/server"

export default async function PrivacyPage() {
  const t = await getTranslations("Legal")

  return (
    <div className="container mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-2xl font-bold tracking-tight">{t("privacyTitle")}</h1>
      <p className="mt-4 text-muted-foreground">{t("comingSoon")}</p>
    </div>
  )
}
