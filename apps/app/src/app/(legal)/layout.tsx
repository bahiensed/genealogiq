import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Header } from "@/components/header"
import { GuestHeader } from "@/components/guest-header"
import { getUnreadCount } from "@/queries/notifications"

// Legal pages (Privacy/Terms/Cancellation & Refund) are reachable from the
// footer by anyone — mirrors (public)/layout.tsx's session-aware chrome.
export default async function LegalLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await auth()

  if (!session?.user) {
    return (
      <>
        <GuestHeader />
        {children}
      </>
    )
  }

  const [unreadCount, user] = await Promise.all([
    getUnreadCount(session.user.id),
    prisma.appUser.findUnique({
      where: { id: session.user.id },
      select: { firstName: true, lastName: true, avatarUrl: true },
    }),
  ])

  return (
    <>
      <Header
        userImage={user?.avatarUrl}
        userName={user ? `${user.firstName} ${user.lastName}` : undefined}
        unreadCount={unreadCount}
      />
      {children}
    </>
  )
}
