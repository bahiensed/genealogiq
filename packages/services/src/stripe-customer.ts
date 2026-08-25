import 'server-only'

import { prisma } from '@genealogiq/db'
import { stripe } from './stripe'

/**
 * One Stripe Customer per Tenant — billing and invoices stay consolidated
 * whichever way the tenant bought: an employee checking out in SEQ, or a
 * GenealogiQ operator generating a payment link in BMS. Both apps resolve the
 * customer through here so the two paths can never fork into two customers for
 * the same funeral home.
 *
 * Idempotent: the id is cached on Tenant.stripeCustomerId after the first call.
 */
export async function ensureTenantStripeCustomer(tenantId: string): Promise<string> {
  const tenant = await prisma.tenant.findUnique({
    where:  { id: tenantId },
    select: { stripeCustomerId: true, email: true, tradeName: true, name: true },
  })
  if (!tenant) throw new Error('Tenant not found')
  if (tenant.stripeCustomerId) return tenant.stripeCustomerId

  const customer = await stripe.customers.create({
    email:    tenant.email,
    name:     tenant.tradeName || tenant.name,
    metadata: { tenantId },
  })

  await prisma.tenant.update({
    where: { id: tenantId },
    data:  { stripeCustomerId: customer.id },
  })

  return customer.id
}
