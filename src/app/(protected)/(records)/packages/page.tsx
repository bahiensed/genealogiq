import Link from 'next/link'
import { verifySession } from '@/lib/dal'
import { getPackages } from '@/queries/packages'
import { PackagesDataTable } from '@/components/packages/packages-data-table'
import { Button } from '@/components/ui/button'

export default async function PackagesPage() {
  const session = await verifySession()
  const packages = await getPackages()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">
          QR Code Packages (B2B)
        </h1>
        <Button asChild>
          <Link href="/packages/new">New package</Link>
        </Button>
      </div>

      <PackagesDataTable currentUserRole={session.user.role} data={packages} />
    </div>
  )
}
