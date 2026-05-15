import Link from "next/link"
import { ArrowRight, QrCode } from "lucide-react"
import { AuroraBackdrop } from "@/components/aurora-backdrop"
import { BackButton } from "@/components/back-button"
import { SubscriptionsGrid } from "@/components/subscriptions-grid"
import { Button } from "@/components/ui/button"
import { verifySession } from "@/lib/dal"
import { getActiveSubscriptions } from "@/queries/subscriptions"
import { getActivePlan } from "@/queries/billing"

export default async function BillingQrCodePage() {
  const session = await verifySession()
  const [subscriptions, activePlan] = await Promise.all([
    getActiveSubscriptions(),
    getActivePlan(session.user.id),
  ])
  const paidPlans = subscriptions.filter((s) => s.code !== "FREE")
  const entryPlan = paidPlans[0] ? [paidPlans[0]] : []

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      <AuroraBackdrop variant="page" intensity="bold" />

      <main className="container relative pt-24 pb-32 max-w-3xl">
        <section className="mb-10 animate-fade-in">
          <div className="flex items-center gap-3 md:gap-4">
            <BackButton href="/home" label="Back" />
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">Get a QR Code</h1>
          </div>
          <p className="text-muted-foreground mt-2 italic">
            One QR Code, scannable forever — for plaques, headstones and digital spaces alike
          </p>
        </section>

        {entryPlan.length > 0 ? (
          <SubscriptionsGrid subscriptions={entryPlan} activePlan={activePlan} />
        ) : (
          <div className="glass-card no-sheen flex flex-col items-center justify-center gap-3 py-20 text-center animate-fade-in">
            <QrCode className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground text-sm">No QR Code packages available right now.</p>
          </div>
        )}

        <div className="mt-10 flex items-center justify-center animate-fade-in" style={{ animationDelay: "120ms" }}>
          <Button variant="ghost" asChild className="gap-2">
            <Link href="/subscriptions">
              Compare all plans
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </main>
    </div>
  )
}
