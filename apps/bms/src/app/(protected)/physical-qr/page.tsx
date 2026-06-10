import Link from 'next/link'
import { verifySession } from '@/lib/dal'
import { getPackages } from '@/queries/packages'
import { PackagesDataTable } from '@/components/packages/packages-data-table'
import { Button } from '@genealogiq/ui/button'

export default async function PhysicalQrPage() {
  const session = await verifySession()

  const packages = await getPackages('PHYSICAL')

  return (
    <div className="flex flex-col gap-10">

      {/* ── Physical QR Codes ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">
            Physical QR Codes
          </h1>
          <Button asChild>
            <Link href="/physical-qr/new">New product</Link>
          </Button>
        </div>

        <PackagesDataTable
          currentUserRole={session.user.role}
          data={packages}
          basePath="/physical-qr"
          noun="product"
          emptyMessage="No physical QR products yet."
        />
      </div>

    </div>
  )
}
