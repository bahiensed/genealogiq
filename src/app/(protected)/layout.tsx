import { verifySession } from '@/lib/dal'
import { Header } from '@/components/header'

export default async function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await verifySession()

  return (
    <>
      <Header
        userName={session.user.name}
        userImage={session.user.image}
      />
      {children}
    </>
  )
}
