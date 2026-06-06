import Link from 'next/link'
import { verifyTenantSession } from '@/lib/dal'
import { prisma } from '@/lib/prisma'
import { Button } from '@genealogiq/ui/button'

export default async function InventoryPackagesPage() {
  const session = await verifyTenantSession()
  const inventory = await prisma.qrInventory.findUnique({
    where: { tenantId: session.customerId },
    select: { quantity: true },
  })
  const qrCodeCount = inventory?.quantity ?? 0

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">
          My Digital QR Codes
        </h1>
        <Button asChild>
          <Link href="/purchasing/digital-qr">Buy digital QR codes</Link>
        </Button>
      </div>

      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">QR Codes</th>
              <th className="px-4 py-3 text-right font-medium">Available for Sale</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="px-4 py-3 font-medium">QR Codes</td>
              <td className="px-4 py-3 text-right tabular-nums">{qrCodeCount}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
