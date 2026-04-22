import { verifySession } from '@/lib/dal'
import { Header } from '@/components/header'
import { getPendingTributeNotifications } from '@/queries/tribute'

export default async function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await verifySession()
  const notifications = await getPendingTributeNotifications(session.user.id)

  return (
    <>
      <Header
        userImage={session.user.image}
        userName={session.user.name}
        notifications={notifications}
      />
      {children}
    </>
  )
}
