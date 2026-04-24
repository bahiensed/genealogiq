import { verifySession } from '@/lib/dal'
import { prisma } from '@/lib/prisma'
import { Header } from '@/components/header'
import { getPendingTributeNotifications } from '@/queries/tribute'

export default async function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await verifySession()
  const [notifications, user] = await Promise.all([
    getPendingTributeNotifications(session.user.id),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { firstName: true, lastName: true, avatarUrl: true },
    }),
  ])

  return (
    <>
      <Header
        userImage={user?.avatarUrl}
        userName={user ? `${user.firstName} ${user.lastName}` : undefined}
        notifications={notifications}
      />
      {children}
    </>
  )
}
