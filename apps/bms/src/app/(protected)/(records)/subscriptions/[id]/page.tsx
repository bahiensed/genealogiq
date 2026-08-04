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
        priceUsd:        subscription.priceUsd,
        monthlyPriceUsd: subscription.monthlyPriceUsd ?? 0,
        priceBrl:        subscription.priceBrl ?? 0,
        monthlyPriceBrl: subscription.monthlyPriceBrl ?? 0,
        priceMxn:        subscription.priceMxn ?? 0,
        monthlyPriceMxn: subscription.monthlyPriceMxn ?? 0,
        treeMaxMembers:        subscription.treeMaxMembers,
        bioMaxChars:           subscription.bioMaxChars,
        mediaMaxImages:        subscription.mediaMaxImages,
        mediaMaxVideos:        subscription.mediaMaxVideos,
        documentsMax:          subscription.documentsMax,
        geoPlacesMax:          subscription.geoPlacesMax,
        memorialsMax:          subscription.memorialsMax,
        petsMax:               subscription.petsMax,
        qrCodeMax:             subscription.qrCodeMax,
        geolocationFullAccess: subscription.geolocationFullAccess,
      }}
      stripeProductId={subscription.stripeProductId}
      stripeAnnualPriceIdUsd={subscription.stripeAnnualPriceIdUsd}
      stripeMonthlyPriceIdUsd={subscription.stripeMonthlyPriceIdUsd}
      stripeAnnualPriceIdBrl={subscription.stripeAnnualPriceIdBrl}
      stripeMonthlyPriceIdBrl={subscription.stripeMonthlyPriceIdBrl}
      stripeAnnualPriceIdMxn={subscription.stripeAnnualPriceIdMxn}
      stripeMonthlyPriceIdMxn={subscription.stripeMonthlyPriceIdMxn}
    />
  )
}
