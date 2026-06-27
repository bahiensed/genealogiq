import Link from "next/link"
import { Ghost } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { Button } from "@genealogiq/ui/button"

export default async function NotFound() {
  const t = await getTranslations("NotFound")
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <Ghost className="h-16 w-16 text-muted-foreground opacity-40" />
      <div className="space-y-2">
        <h1 className="text-4xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>
      <Button asChild>
        <Link href="/dashboard">{t("goHome")}</Link>
      </Button>
    </div>
  )
}
