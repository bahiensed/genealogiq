import { getTranslations } from "next-intl/server"
import { auth } from "@/auth"
import { FeedbackDialog } from "@/components/feedback-dialog"

// Rendered once in the root layout so it covers every route. Only shown to
// authenticated users.
export async function Footer() {
  const session = await auth()
  if (!session?.user) return null

  const t = await getTranslations("Feedback")

  return (
    <footer className="w-full py-4 px-4 md:px-8">
      <div className="container mx-auto flex justify-end items-center gap-3 text-xs">
        <FeedbackDialog type="bug" label={t("links.reportBug")} />
        <span aria-hidden className="text-muted-foreground">|</span>
        <FeedbackDialog type="feedback" label={t("links.sendFeedback")} />
      </div>
    </footer>
  )
}
