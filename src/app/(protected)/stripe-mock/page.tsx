import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { verifySession } from "@/lib/dal"
import { StripeMockContent } from "@/components/stripe-mock-content"

interface Props {
  searchParams: Promise<{ type?: string; subscriptionId?: string; returnTo?: string }>
}

export default async function StripeMockPage({ searchParams }: Props) {
  await verifySession()
  const { type, subscriptionId, returnTo } = await searchParams

  if (type !== "subscription" || !subscriptionId) notFound()

  const subscription = await prisma.subscription.findUnique({
    where: { id: subscriptionId, isActive: true },
    select: {
      id:               true,
      name:             true,
      description:      true,
      price:            true,
      maxProfiles:      true,
      termLength:       true,
      bioMaxChars:      true,
      bioMaxImages:     true,
      galleryMaxImages: true,
      galleryMaxVideos: true,
    },
  })
  if (!subscription) notFound()

  return (
    <StripeMockContent
      subscriptionId={subscription.id}
      planName={subscription.name}
      planDescription={subscription.description}
      price={Number(subscription.price)}
      termLength={subscription.termLength}
      memorialSlots={subscription.maxProfiles}
      bioMaxChars={subscription.bioMaxChars}
      bioMaxImages={subscription.bioMaxImages}
      galleryMaxImages={subscription.galleryMaxImages}
      galleryMaxVideos={subscription.galleryMaxVideos}
      returnTo={returnTo ?? "/plans"}
    />
  )
}
