import { verifyTenantSession } from '@/lib/dal'
import { prisma } from '@/lib/prisma'

export default async function InventoryLicensesPage() {
  const session = await verifyTenantSession()
  const inventory = await prisma.customerLicense.findMany({
    where: { customerId: session.customerId },
    select: {
      quantity: true,
      license: { select: { name: true, description: true } },
    },
    orderBy: { license: { name: 'asc' } },
  })

  return (
    <div className="flex flex-col gap-6">
      <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">
        Available Licenses
      </h1>

      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">License</th>
              <th className="px-4 py-3 text-left font-medium">Description</th>
              <th className="px-4 py-3 text-right font-medium">Available</th>
            </tr>
          </thead>
          <tbody>
            {inventory.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                  No licenses available.
                </td>
              </tr>
            ) : (
              inventory.map((item) => (
                <tr key={item.license.name} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">{item.license.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{item.license.description ?? '—'}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{item.quantity}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
