import { AuroraBackdrop } from "@/components/aurora-backdrop"
import { BackButton } from "@/components/back-button"
import { MessagesList } from "@/components/messages-list"
import { verifySession } from "@/lib/dal"
import { prisma } from "@/lib/prisma"
import { getMessages } from "@/queries/notifications"

export default async function MessagesPage() {
  const session = await verifySession()
  const data = await getMessages(session.user.id)

  // Visiting the inbox = "I saw them all" → clears the bell badge.
  await prisma.notification.updateMany({
    where: { userId: session.user.id, readAt: null },
    data:  { readAt: new Date() },
  })

  const totalPending = data.pendingTributes.length + data.pendingFamilyRequests.length

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      <AuroraBackdrop variant="page" intensity="bold" />

      <main className="container relative pt-24 pb-32 max-w-6xl">
        <div className="flex items-center justify-between gap-3 mb-2 animate-fade-in">
          <div className="flex items-center gap-3 md:gap-4 min-w-0">
            <BackButton href="/home" label="Back to home" />
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight whitespace-nowrap">Messages</h1>
          </div>
          {totalPending > 0 && (
            <span className="shrink-0 inline-flex items-center rounded-full bg-primary text-primary-foreground text-xs font-semibold px-2.5 py-0.5">
              {totalPending} pending
            </span>
          )}
        </div>

        <MessagesList data={data} sessionUserId={session.user.id} />
      </main>
    </div>
  )
}
