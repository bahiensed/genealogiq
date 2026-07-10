import type { Metadata } from "next"
import { WifiOff } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { buttonVariants } from "@/components/ui/button"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Offline")
  return {
    title: t("title"),
    robots: { index: false, follow: false },
  }
}

export default async function OfflinePage() {
  const t = await getTranslations("Offline")
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 text-center px-4">
      <WifiOff className="h-16 w-16 text-muted-foreground opacity-40" />
      <div className="space-y-2">
        <h1 className="text-4xl font-extrabold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>
      {/* Plain anchor, not a client button: the offline snapshot is served as
          the body of whatever URL the user tried to reach, and its JS chunks
          may not be cached — href="" re-requests that same URL with zero JS. */}
      <a href="" className={buttonVariants({ variant: "outline" })}>
        {t("retry")}
      </a>
    </div>
  )
}
