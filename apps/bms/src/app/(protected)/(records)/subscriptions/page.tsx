import Link from 'next/link'
import { verifySession } from '@/lib/dal'
import { getSubscriptions } from '@/queries/subscriptions'
import { SubscriptionsDataTable } from '@/components/subscriptions/subscriptions-data-table'
import { Button } from '@/components/ui/button'

export default async function SubscriptionsPage() {
  const session = await verifySession()
  const subscriptions = await getSubscriptions()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">
          Subscriptions (B2C)
        </h1>
        <Button asChild>
          <Link href="/subscriptions/new">New subscription</Link>
        </Button>
      </div>

      <SubscriptionsDataTable currentUserRole={session.user.role} data={subscriptions} />
    </div>
  )
}
