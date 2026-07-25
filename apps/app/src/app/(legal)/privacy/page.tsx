import { getTranslations } from "next-intl/server"

export default async function PrivacyPage() {
  const t = await getTranslations("Legal")

  return (
    <main className="container relative pt-24 pb-32">
      <div className="mb-8 animate-fade-in">
        <h1 className="text-4xl font-semibold tracking-tight">{t("privacyTitle")}</h1>
        <p className="mt-4 text-muted-foreground">{t("comingSoon")}</p>
      </div>
    </main>
  )
}
