import Link from "next/link"
import { UserPlus } from "lucide-react"
import { AuroraBackdrop } from "@/components/aurora-backdrop"
import { BackButton } from "@/components/back-button"
import { FamilyRequestsClient } from "@/components/family-requests-client"
import { verifySession } from "@/lib/dal"
import { getPendingFamilyRequests } from "@/queries/notifications"

export default async function FamilyRequestsPage() {
  const session = await verifySession()
  const requests = await getPendingFamilyRequests(session.user.id)

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      <AuroraBackdrop variant="top" />

      <main className="container relative pt-24 pb-32 max-w-3xl">
        <section className="mb-8 animate-fade-in">
          <div className="flex items-center gap-3 md:gap-4">
            <BackButton href="/home" label="Back to home" />
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">Tree invitations</h1>
          </div>
          <p className="text-muted-foreground mt-2 italic">
            People who would like to add you to their family tree.
          </p>
        </section>

        {requests.length === 0 ? (
          <div className="glass-card flex flex-col items-center justify-center gap-3 py-20 text-center animate-fade-in">
            <UserPlus className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-muted-foreground">No pending invitations.</p>
            <Link href="/home" className="text-sm text-primary hover:underline">Back to home</Link>
          </div>
        ) : (
          <FamilyRequestsClient sessionUserId={session.user.id} requests={requests.map((r) => ({
            id:         r.id,
            type:       r.type,
            subtype:    r.subtype,
            fromId:     r.fromId,
            toId:       r.toId,
            startDate:  r.startDate?.toISOString() ?? null,
            endDate:    r.endDate?.toISOString() ?? null,
            createdAt:  r.createdAt.toISOString(),
            from:       r.from,
            to:         r.to,
          }))} />
        )}
      </main>
    </div>
  )
}
