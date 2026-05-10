import Link from 'next/link'
import { verifySession } from '@/lib/dal'
import { getUsers } from '@/queries/users'
import { UsersDataTable } from '@/components/users/users-data-table'
import { Button } from '@/components/ui/button'

export default async function UsersPage() {
  const session = await verifySession()
  const users = await getUsers()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">
          Employees
        </h1>
        <Button asChild>
          <Link href="/users/new">New employee</Link>
        </Button>
      </div>

      <UsersDataTable currentUserId={session.user!.id!} data={users} />
    </div>
  )
}
