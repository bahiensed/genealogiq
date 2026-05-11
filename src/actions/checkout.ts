"use server"

import { revalidatePath } from "next/cache"
import { verifySession } from "@/lib/dal"
import { prisma } from "@/lib/prisma"

type ActionResult<T> = { error: string } | T

export async function createSubscriptionCheckoutSession(
  subscriptionId: string,
): Promise<ActionResult<{ url: string }>> {
  await verifySession()

  const subscription = await prisma.subscription.findUnique({
    where:  { id: subscriptionId, isActive: true },
    select: { id: true, code: true, price: true },
  })
  if (!subscription) return { error: "Plan not found or unavailable." }
  if (Number(subscription.price) <= 0) return { error: "This plan cannot be purchased." }

  // Fake checkout: redirect to internal mock page. When Stripe is wired,
  // this action will return a real Stripe Checkout Session URL instead.
  const params = new URLSearchParams({
    type:           "subscription",
    subscriptionId: subscription.id,
    returnTo:       "/plans",
  })
  return { url: `/stripe-mock?${params.toString()}` }
}

export async function purchaseSubscription(
  subscriptionId: string,
): Promise<ActionResult<{ success: string }>> {
  const session = await verifySession()

  const subscription = await prisma.subscription.findUnique({
    where:  { id: subscriptionId, isActive: true },
    select: { id: true, name: true },
  })
  if (!subscription) return { error: "Plan not found or unavailable." }

  await prisma.appSale.create({
    data: { appUserId: session.user.id, subscriptionId: subscription.id },
  })

  revalidatePath(`/profile/${session.user.id}/memorialized`)
  revalidatePath("/plans")
  return { success: `${subscription.name} plan activated.` }
}
