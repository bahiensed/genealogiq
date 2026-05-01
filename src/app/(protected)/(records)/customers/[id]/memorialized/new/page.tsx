import { notFound, redirect } from 'next/navigation'
import { getCustomer } from '@/queries/customers'
import { MemorializedNewForm } from '@/components/memorialized/memorialized-new-form'

export default async function NewMemorializedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const customer = await getCustomer(id)
  if (!customer) notFound()

  const available = Math.max(0, customer._count.appSales - customer._count.guardiansOf)
  if (available <= 0) redirect(`/customers/${id}`)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">
          New memorialized profile
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Customer: <span className="font-medium text-foreground">{customer.firstName} {customer.lastName}</span>
          {' · '}
          <span>{available} QR code{available !== 1 ? 's' : ''} available</span>
        </p>
      </div>
      <MemorializedNewForm appUserId={id} />
    </div>
  )
}
