import { verifySession } from '@/lib/dal'
import { prisma } from '@/lib/prisma'
import { Header } from '@/components/header'
import { getUnreadCount } from '@/queries/notifications'

export default async function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await verifySession()
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
