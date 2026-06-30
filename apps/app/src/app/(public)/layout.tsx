import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Header } from "@/components/header"
import { GuestHeader } from "@/components/guest-header"
import { getUnreadCount } from "@/queries/notifications"

// Public route group: pages here decide their own access in their bodies (memorial
// profiles allow anonymous viewers; living profiles and management routes self-gate
// via verifySession). The layout never forces a session — it only picks the chrome:
// the full Header for authenticated users, the GuestHeader (Sign in / Sign up) for
// anonymous visitors.
export default async function PublicLayout({
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
