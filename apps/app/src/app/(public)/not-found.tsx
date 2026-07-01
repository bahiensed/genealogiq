import Link from "next/link"
import { Ghost } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { Button } from "@/components/ui/button"
import { AuroraBackdrop } from "@/components/aurora-backdrop"

// Rendered when a profile page throws notFound() (an authenticated viewer hitting a
// missing id — anonymous visitors are redirected to sign-in before this point).
// Renders inside the (public) layout, so it keeps the header chrome.
export default async function PublicNotFound() {
  const t = await getTranslations("NotFound")
  return (
    <div className="min-h-screen relative overflow-x-hidden">
      <AuroraBackdrop variant="page" />
      <main className="container relative flex min-h-screen flex-col items-center justify-center gap-6 pt-24 text-center">
        <Ghost className="h-16 w-16 text-muted-foreground opacity-40" />
        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
        <Button asChild>
          <Link href="/home">{t("goHome")}</Link>
        </Button>
      </main>
    </div>
  )
}
