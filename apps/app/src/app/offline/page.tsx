import { WifiOff } from "lucide-react"
import { getTranslations } from "next-intl/server"

export default async function OfflinePage() {
  const t = await getTranslations("Offline")
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 text-center px-4">
      <WifiOff className="h-16 w-16 text-muted-foreground opacity-40" />
      <div className="space-y-2">
        <h1 className="text-4xl font-extrabold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>
    </div>
  )
}
