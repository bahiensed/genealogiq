import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { FeedbackDialog } from "@/components/feedback-dialog"

// Rendered once in the root layout so it covers every route, authenticated
// or not — Privacy/Terms/Cancellation must be reachable by anonymous visitors.
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

        {/* Deterministic 2+3 split on xs/sm (Contact+Career, then the 3 legal
            links) instead of relying on natural flex-wrap, since link text
            length varies a lot by locale (pt-BR "Cancelamento e Reembolso"
            is much longer than en-US) and could wrap at a different point
            per language. The two groups sit side by side as one row from md up. */}
        <div className="mt-2 flex flex-col items-center gap-2 md:flex-row md:flex-wrap md:justify-center">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <FeedbackDialog type="contact" label={t("links.contact")} />
            <FeedbackDialog type="career" label={t("links.career")} />
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Link href="/privacy" className={linkClass}>{t("footer.privacy")}</Link>
            <Link href="/terms" className={linkClass}>{t("footer.terms")}</Link>
            <Link href="/cancellation-refund" className={linkClass}>{t("footer.cancellationRefund")}</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
