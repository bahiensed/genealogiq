import { AuroraBackdrop } from "@/components/aurora-backdrop"
import { BackButton } from "@/components/back-button"
import { ManageSubscriptionButton } from "@/components/manage-subscription-button"
import { SubscriptionsGrid } from "@/components/subscriptions-grid"
import { verifySession } from "@/lib/dal"
import { getActiveSubscriptions } from "@/queries/subscriptions"
import { getActivePlan } from "@/queries/billing"

const longDate = new Intl.DateTimeFormat("en-US", {
  year: "numeric", month: "long", day: "numeric", timeZone: "UTC",
})

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
          <div className="flex items-center gap-3 md:gap-4">
            <BackButton href="/home" label="Back to home" />
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight whitespace-nowrap">Subscriptions</h1>
          </div>
          <section className="mt-2 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
            <div className="flex flex-col gap-1 min-w-0">
              <p className="text-muted-foreground italic">
                Choose the perfect way to stay in touch with your beloved ones
              </p>
              {activePlan && (
                <p className="text-xs text-muted-foreground">
                  Currently on {activePlan.subscription.name} until {longDate.format(activePlan.currentPeriodEnd)}
                </p>
              )}
            </div>
            {activePlan && (
              <div className="shrink-0 self-end lg:self-auto">
                <ManageSubscriptionButton />
              </div>
            )}
          </section>
        </div>

        <SubscriptionsGrid subscriptions={subscriptions} activePlan={activePlan} flashStatus={flashStatus} />
      </main>
    </div>
  )
}
