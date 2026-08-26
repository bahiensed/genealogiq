import { describe, it, expect, vi, beforeEach } from 'vitest'
vi.mock('server-only', () => ({}))

import { grantActivationTrial } from './activation-trial'

const tx = {
  subscription: { findUnique: vi.fn() },
  appSale:      { findFirst: vi.fn(), create: vi.fn() },
}

beforeEach(() => {
  vi.clearAllMocks()
  tx.subscription.findUnique.mockResolvedValue({ id: 'sub_premium' })
  tx.appSale.findFirst.mockResolvedValue(null)
})

const input = { guardianId: 'g1', tenantId: 't1', months: 12, planCode: 'PREMIUM' }

describe('grantActivationTrial', () => {
  it('grants the configured plan to the guardian', async () => {
    const r = await grantActivationTrial(tx as never, input)

    expect(r.granted).toBe(true)
    const data = tx.appSale.create.mock.calls[0][0].data
    expect(data).toMatchObject({ appUserId: 'g1', subscriptionId: 'sub_premium', tenantId: 't1' })
    // `trialing` is already one of the two statuses getMemorialFeatures treats
    // as live, so entitlement needs no special case for a card-less trial.
    expect(data.status).toBe('trialing')
    expect(data.currentPeriodEnd.getTime()).toBeGreaterThan(Date.now())
  })

  it('does nothing when the plan configures no trial', async () => {
    const r = await grantActivationTrial(tx as never, { ...input, months: 0 })
    expect(r).toEqual({ granted: false, reason: 'no-trial-configured' })
    expect(tx.appSale.create).not.toHaveBeenCalled()
  })

  it('does nothing when the trial names a plan code that does not exist', async () => {
    tx.subscription.findUnique.mockResolvedValue(null)
    const r = await grantActivationTrial(tx as never, { ...input, planCode: 'GHOST' })
    expect(r).toEqual({ granted: false, reason: 'plan-not-found' })
  })

  // Three plaques sold to one family must not become three overlapping trials.
  it('grants at most one per guardian, ever', async () => {
    tx.appSale.findFirst.mockResolvedValue({ id: 'existing' })
    const r = await grantActivationTrial(tx as never, input)
    expect(r).toEqual({ granted: false, reason: 'already-has-one' })
    expect(tx.appSale.create).not.toHaveBeenCalled()
  })

  it('leaves Stripe columns empty — nothing was charged', async () => {
    await grantActivationTrial(tx as never, input)
    const data = tx.appSale.create.mock.calls[0][0].data
    expect(data.stripeSubscriptionId).toBeUndefined()
    expect(data.stripePriceId).toBeUndefined()
  })
})
