import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { verifySession } from '@/lib/dal'
import { getUsers } from '@/queries/users'
import { UsersDataTable } from '@/components/users/users-data-table'
import { Button } from '@genealogiq/ui/button'

export default async function UsersPage() {
  const session = await verifySession()
  const users = await getUsers()
  const t = await getTranslations('Users')

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">
          {t('title')}
        </h1>
        <Button asChild>
          <Link href="/system/users/new">{t('new')}</Link>
        </Button>
      </div>

      <UsersDataTable currentUserId={session.user!.id!} currentUserRole={session.user.role} data={users} />
    </div>
  )
}
