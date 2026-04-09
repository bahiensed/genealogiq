import { prisma } from '@/lib/prisma'
import { verifyTenantSession } from '@/lib/dal'
import { LicenseStore } from '@/components/purchasing/license-store'

export default async function PurchasingLicensesPage() {
  await verifyTenantSession()

  const packages = await prisma.package.findMany({
    where: { isActive: true },
    select: {
      id:          true,
      name:        true,
      description: true,
      price:       true,
      quantity:    true,
      license: {
        select: { component: true, description: true },
      },
    },
    orderBy: { quantity: 'asc' },
  })

  const data = packages.map((p) => ({ ...p, price: Number(p.price) }))

  return (
    <div className="flex flex-col gap-6">
      <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">
        Comprar Licenças
      </h1>
      <LicenseStore packages={data} />
    </div>
  )
}
