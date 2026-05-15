import { AuroraBackdrop } from "@/components/aurora-backdrop"
import { BackButton } from "@/components/back-button"
import { PlansGrid } from "@/components/plans-grid"
import { verifySession } from "@/lib/dal"
import { getActiveSubscriptions } from "@/queries/subscriptions"
import { getActivePlan } from "@/queries/billing"

interface Props {
  searchParams: Promise<{ status?: string }>
}

export default async function PlansPage({ searchParams }: Props) {
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
        <section className="mb-10 animate-fade-in">
          <div className="flex items-center gap-3 md:gap-4">
            <BackButton href="/home" label="Back" />
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">Plans & billing</h1>
          </div>
          <p className="text-muted-foreground mt-2 italic max-w-2xl">
            Choose how generous a canvas you want for each memorial — more characters, more photos,
            more videos, more slots. Every purchase carries forward forever
          </p>
        </section>

        <PlansGrid subscriptions={subscriptions} activePlan={activePlan} flashStatus={flashStatus} />
      </main>
    </div>
  )
}
