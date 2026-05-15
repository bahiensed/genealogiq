import { AuroraBackdrop } from "@/components/aurora-backdrop"
import { BackButton } from "@/components/back-button"
import { SubscriptionsGrid } from "@/components/subscriptions-grid"
import { verifySession } from "@/lib/dal"
import { getActiveSubscriptions } from "@/queries/subscriptions"
import { getActivePlan } from "@/queries/billing"

interface Props {
  searchParams: Promise<{ status?: string }>
}

export default async function SubscriptionsPage({ searchParams }: Props) {
  const session = await verifySession()
  const [{ status }, subscriptions, activePlan] = await Promise.all([
    searchParams,
    getActiveSubscriptions(),
    getActivePlan(session.user.id),
  ])

  const flashStatus = status === "success" ? "success" : status === "cancel" ? "cancel" : null

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      <AuroraBackdrop variant="page" intensity="bold" />

      <main className="container relative pt-24 pb-32 max-w-6xl">
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 md:gap-4 min-w-0">
              <BackButton href="/home" label="Back" />
              <h1 className="text-4xl md:text-5xl font-semibold tracking-tight whitespace-nowrap">Subscriptions</h1>
            </div>
          </div>
          <p className="text-muted-foreground mt-2 italic">
            Choose the perfect way to stay in touch with your beloved ones.
          </p>
        </div>

        <SubscriptionsGrid subscriptions={subscriptions} activePlan={activePlan} flashStatus={flashStatus} />
      </main>
    </div>
  )
}
