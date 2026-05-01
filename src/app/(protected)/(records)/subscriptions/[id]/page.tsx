import { notFound } from 'next/navigation'
import { getSubscription } from '@/queries/subscriptions'
import { SubscriptionForm } from '@/components/subscriptions/subscription-form'

export default async function EditSubscriptionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const subscription = await getSubscription(id)
  if (!subscription) notFound()

  return (
    <SubscriptionForm
      id={id}
      defaultValues={{
        name:        subscription.name,
        description: subscription.description ?? '',
        maxProfiles: subscription.maxProfiles,
        termLength:  subscription.termLength,
        price:       subscription.price,
        isActive:    subscription.isActive,
      }}
    />
  )
}
