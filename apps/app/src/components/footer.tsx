import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { FeedbackDialog } from "@/components/feedback-dialog"

// Rendered once in the root layout so it covers every route, authenticated
// or not — Terms & Privacy must be reachable by anonymous visitors.
export async function Footer() {
  const t = await getTranslations("Feedback")
  const year = new Date().getFullYear()

  const linkClass = "text-muted-foreground hover:text-foreground underline-offset-4 hover:underline transition-colors"

  return (
    <footer className="w-full pt-4 pb-8 px-4 md:px-8">
      <div className="container mx-auto flex flex-col gap-2 text-xs">
        <div className="flex justify-end">
          <FeedbackDialog type="bug" label={t("links.reportBug")} />
        </div>

        <hr className="mt-2 border-border" />

        <p className="mt-2 text-center text-muted-foreground">{t("footer.copyright", { year })}</p>

        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          <FeedbackDialog type="contact" label={t("links.contact")} />
          <FeedbackDialog type="career" label={t("links.career")} />
          <Link href="/terms" className={linkClass}>{t("footer.terms")}</Link>
        </div>
      </div>
    </footer>
  )
}
