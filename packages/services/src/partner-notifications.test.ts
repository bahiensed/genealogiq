import { describe, it, expect, vi, beforeEach } from 'vitest'

const { prismaMock, mail, lifecycleMock, trialMock, creditsMock } = vi.hoisted(() => ({
  prismaMock: {
    stripeEvent:         { create: vi.fn(), delete: vi.fn() },
    partnerSubscription: { findUnique: vi.fn() },
    appUser:             { findUnique: vi.fn() },
    creditGrant:         { findMany: vi.fn() },
  },
  mail: {
    sendRenewalReminderEmail: vi.fn(),
    sendPastDueEmail:         vi.fn(),
    sendGraceReminderEmail:   vi.fn(),
    sendCycleExpiredEmail:    vi.fn(),
    sendTrialEndingEmail:     vi.fn(),
  },
  lifecycleMock: { findRenewalMilestones: vi.fn(), RENEWAL_MILESTONES: [-30, 0, 30, 31] },
  trialMock:     { findEndingTrials: vi.fn() },
  creditsMock:   { getCreditBalance: vi.fn() },
}))

vi.mock('@genealogiq/db', () => ({ prisma: prismaMock }))
vi.mock('@genealogiq/email', () => mail)
vi.mock('server-only', () => ({}))
vi.mock('./partner-lifecycle', () => lifecycleMock)
vi.mock('./activation-trial', () => trialMock)
vi.mock('./credits', () => creditsMock)
vi.mock('./rollover', () => ({
  decideRollover: () => ({ quantity: 30, usedFounder: false, validity: 'months' }),
  countRollableCredits: async () => 70,
}))

import { runPartnerNotifications, runTrialNotifications } from './partner-notifications'

const window = (day: number) => ({
  subscriptionId: 'ps1', tenantId: 't1', daysFromEnd: day,
  endAt: new Date('2027-01-01'), graceEndAt: new Date('2027-01-31'),
})

const contract = (status = 'PAST_DUE') => ({
  id: 'ps1', tenantId: 't1', status,
  founderRolloverEligible: false, founderRolloverUsed: false,
  plan:   { name: 'Semente', annualAllowance: 100, rolloverRate: '0.300' },
  tenant: { email: 'partner@example.com', name: 'Casa', tradeName: 'Casa Funerária' },
  currentCycle: { id: 'cyc1' },
})

beforeEach(() => {
  vi.clearAllMocks()
  prismaMock.stripeEvent.create.mockResolvedValue({})
  prismaMock.partnerSubscription.findUnique.mockResolvedValue(contract())
  creditsMock.getCreditBalance.mockResolvedValue({ total: 70, general: 70, committed: 0, nextExpiry: null })
  lifecycleMock.findRenewalMilestones.mockResolvedValue(new Map())
  trialMock.findEndingTrials.mockResolvedValue([])
})

describe('runPartnerNotifications', () => {
  it.each([
    [-30, 'sendRenewalReminderEmail'],
    [0,   'sendPastDueEmail'],
    [30,  'sendGraceReminderEmail'],
    [31,  'sendCycleExpiredEmail'],
  ])('sends the right notice at D%i', async (day, fn) => {
    lifecycleMock.findRenewalMilestones.mockResolvedValue(new Map([[day, [window(day)]]]))
    const r = await runPartnerNotifications('https://seq.example')
    expect(r.sent).toBe(1)
    expect(mail[fn as keyof typeof mail]).toHaveBeenCalledTimes(1)
  })

  // A send cannot be rolled back, so the claim comes first and a second run
  // loses to the unique index rather than mailing the partner twice.
  it('never sends the same notice twice', async () => {
    lifecycleMock.findRenewalMilestones.mockResolvedValue(new Map([[0, [window(0)]]]))
    prismaMock.stripeEvent.create.mockRejectedValueOnce(Object.assign(new Error('dup'), { code: 'P2002' }))

    const r = await runPartnerNotifications('https://seq.example')

    expect(r.sent).toBe(0)
    expect(r.skipped).toBe(1)
    expect(mail.sendPastDueEmail).not.toHaveBeenCalled()
  })

  // Otherwise a retry after a provider outage would never send that notice again.
  it('releases the claim when the send fails, so the next run can retry', async () => {
    lifecycleMock.findRenewalMilestones.mockResolvedValue(new Map([[0, [window(0)]]]))
    mail.sendPastDueEmail.mockRejectedValueOnce(new Error('smtp down'))
    prismaMock.stripeEvent.delete.mockResolvedValue({})

    const r = await runPartnerNotifications('https://seq.example')

    expect(r.failed).toBe(1)
    expect(prismaMock.stripeEvent.delete).toHaveBeenCalled()
  })

  // Chasing a partner who already renewed would be wrong and embarrassing.
  it('does not chase a contract that already renewed', async () => {
    lifecycleMock.findRenewalMilestones.mockResolvedValue(new Map([[30, [window(30)]]]))
    prismaMock.partnerSubscription.findUnique.mockResolvedValue(contract('ACTIVE'))

    const r = await runPartnerNotifications('https://seq.example')

    expect(r.skipped).toBe(1)
    expect(mail.sendGraceReminderEmail).not.toHaveBeenCalled()
  })

  it('skips a partner with no email rather than throwing', async () => {
    lifecycleMock.findRenewalMilestones.mockResolvedValue(new Map([[0, [window(0)]]]))
    prismaMock.partnerSubscription.findUnique.mockResolvedValue({
      ...contract(), tenant: { email: null, name: 'X', tradeName: 'X' },
    })

    const r = await runPartnerNotifications('https://seq.example')
    expect(r.skipped).toBe(1)
  })
})

describe('runTrialNotifications', () => {
  const trial = { appUserId: 'g1', tenantId: 't1', currentPeriodEnd: new Date('2027-03-01') }

  it('warns the guardian their trial is ending', async () => {
    trialMock.findEndingTrials.mockResolvedValue([trial])
    prismaMock.appUser.findUnique.mockResolvedValue({ email: 'family@example.com', firstName: 'Ana' })

    const r = await runTrialNotifications('https://app.example')

    expect(r.sent).toBe(1)
    expect(mail.sendTrialEndingEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'family@example.com', name: 'Ana' }),
    )
  })

  it('is idempotent per guardian and end date', async () => {
    trialMock.findEndingTrials.mockResolvedValue([trial])
    prismaMock.appUser.findUnique.mockResolvedValue({ email: 'family@example.com', firstName: 'Ana' })
    prismaMock.stripeEvent.create.mockRejectedValueOnce(Object.assign(new Error('dup'), { code: 'P2002' }))

    const r = await runTrialNotifications('https://app.example')

    expect(r.sent).toBe(0)
    expect(mail.sendTrialEndingEmail).not.toHaveBeenCalled()
  })
})
