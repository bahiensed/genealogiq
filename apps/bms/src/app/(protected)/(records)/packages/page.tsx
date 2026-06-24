import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { verifySession } from '@/lib/dal'
import { getPackages } from '@/queries/packages'
import { PackagesDataTable } from '@/components/packages/packages-data-table'
import { Button } from '@genealogiq/ui/button'

export default async function PackagesPage() {
  const session = await verifySession()
  const packages = await getPackages('DIGITAL')
  const t = await getTranslations('Packages')

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">
          {t('title')}
        </h1>
        <Button asChild>
          <Link href="/packages/new">{t('newPackage')}</Link>
        </Button>
      </div>

      <PackagesDataTable currentUserRole={session.user.role} data={packages} />
    </div>
  )
}
