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
        code:        subscription.code,
        name:        subscription.name,
        description: subscription.description ?? '',
        isActive:    subscription.isActive,
        maxProfiles:  subscription.maxProfiles,
        termLength:   subscription.termLength,
        price:        subscription.price,
        monthlyPrice: subscription.monthlyPrice ?? 0,
      }}
      stripeProductId={subscription.stripeProductId}
      stripeAnnualPriceId={subscription.stripeAnnualPriceId}
      stripeMonthlyPriceId={subscription.stripeMonthlyPriceId}
    />
  )
}
