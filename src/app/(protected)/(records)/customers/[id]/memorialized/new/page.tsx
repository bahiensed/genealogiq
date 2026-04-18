import { notFound, redirect } from 'next/navigation'
import { getCustomer } from '@/queries/customers'
import { MemorializedForm } from '@/components/memorialized/memorialized-form'

export default async function NewMemorializedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const customer = await getCustomer(id)
  if (!customer) notFound()

  const available = Math.max(0, customer._count.appSales - customer._count.guardianships)
  if (available <= 0) redirect(`/customers/${id}`)

  return (
    <div className="flex flex-col gap-6">
      <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">
        New memorialized profile
      </h1>
      <p className="text-sm text-muted-foreground">
        Customer: <span className="font-medium text-foreground">{customer.firstName} {customer.lastName}</span>
        {' · '}
        <span>{available} license{available !== 1 ? 's' : ''} available</span>
      </p>
      <MemorializedForm appUserId={id} />
    </div>
  )
}
