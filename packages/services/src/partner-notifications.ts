import 'server-only'

import { prisma } from '@genealogiq/db'
import {
  sendRenewalReminderEmail,
  sendPastDueEmail,
  sendGraceReminderEmail,
  sendCycleExpiredEmail,
  sendTrialEndingEmail,
} from '@genealogiq/email'
import { decideRollover, countRollableCredits } from './rollover'
import { getCreditBalance } from './credits'
import { findRenewalMilestones, RENEWAL_MILESTONES } from './partner-lifecycle'
import { findEndingTrials } from './activation-trial'

/**
 * Turns the lifecycle milestones into mail that actually goes out.
 *
 * Two things make this harder than "loop and send", and both are consequences
 * of running on a schedule rather than reacting to an event.
 *
 * **A send cannot be rolled back.** If the job dies halfway through the D-30
 * batch and retries, everyone before the failure gets a second copy. So each
 * send is recorded first, under a unique key, and the key is what makes the
 * second attempt a no-op.
 *
 * **The cron is only accurate to the day, and only if it runs.** On Hobby it
 * fires within an hour of its slot and can be skipped entirely. Nothing here is
 * allowed to be the mechanism enforcing a deadline — the deadlines are enforced
 * on read, in credits.ts and partner-lifecycle.ts. A missed run costs a warning,
 * never a wrong balance.
 */

export interface NotificationRun {
  sent:    number
  skipped: number
  failed:  number
}

/**
 * The idempotency key for one notice.
 *
 * Keyed on the CYCLE and the milestone, not on the date: re-running the job on
 * the same day, or a day late, must not produce a second D-30 for the same
 * cycle. `StripeEvent` is reused as the store — it is already a bare
 * "this-id-was-processed" table, and giving notifications their own would be a
 * second table with the same one job.
 */
function noticeKey(scope: string, id: string, milestone: string): string {
  return `notice:${scope}:${id}:${milestone}`
}

async function claim(key: string, type: string): Promise<boolean> {
  try {
    await prisma.stripeEvent.create({ data: { id: key, type } })
    return true
  } catch (err) {
    // Already claimed by an earlier run.
    if ((err as { code?: string }).code === 'P2002') return false
    throw err
  }
}

/** Releases a claim whose send failed, so the next run can try again. */
async function release(key: string): Promise<void> {
  await prisma.stripeEvent.delete({ where: { id: key } }).catch(() => {})
}

export async function runPartnerNotifications(
  baseUrl: string,
  now = new Date(),
): Promise<NotificationRun> {
  const milestones = await findRenewalMilestones([...RENEWAL_MILESTONES], now)
  let sent = 0, skipped = 0, failed = 0

  for (const [day, windows] of milestones) {
    for (const window of windows) {
      const key = noticeKey('cycle', window.subscriptionId, `d${day}`)

      const contract = await prisma.partnerSubscription.findUnique({
        where:  { id: window.subscriptionId },
        select: {
          id: true, tenantId: true, status: true,
          founderRolloverEligible: true, founderRolloverUsed: true,
          plan:   { select: { name: true, annualAllowance: true, rolloverRate: true } },
          tenant: { select: { email: true, name: true, tradeName: true } },
          currentCycle: { select: { id: true } },
        },
      })
      if (!contract?.tenant.email) { skipped++; continue }

      // A contract that already renewed is not late, whatever its old cycle's
      // dates say — chasing it would be both wrong and embarrassing.
      if (day >= 0 && contract.status === 'ACTIVE') { skipped++; continue }

      if (!(await claim(key, `notice:d${day}`))) { skipped++; continue }

      const balance = await getCreditBalance(contract.tenantId)
      const unusedRollable = contract.currentCycle
        ? await countRollableCredits(prisma, contract.tenantId, contract.currentCycle.id)
        : 0
      const rollover = decideRollover({
        unused:           unusedRollable,
        renewedAllowance: contract.plan.annualAllowance,
        rolloverRate:     Number(contract.plan.rolloverRate),
        founderEligible:  contract.founderRolloverEligible,
        founderUsed:      contract.founderRolloverUsed,
      })

      const payload = {
        to:          contract.tenant.email,
        partnerName: contract.tenant.tradeName || contract.tenant.name,
        planName:    contract.plan.name,
        unused:      balance.general,
        rollover:    rollover.quantity,
        endAt:       window.endAt,
        graceEndAt:  window.graceEndAt,
        url:         `${baseUrl}/purchasing/plans`,
      }

      try {
        if (day < 0)       await sendRenewalReminderEmail({ ...payload, daysOut: Math.abs(day) })
        else if (day === 0) await sendPastDueEmail(payload)
        else if (day <= 30) await sendGraceReminderEmail({ ...payload, lastCall: day === 30 })
        else                await sendCycleExpiredEmail(payload)
        sent++
      } catch (err) {
        console.error('[notifications] renewal notice failed', { key, err })
        await release(key)
        failed++
      }
    }
  }

  return { sent, skipped, failed }
}

/**
 * The B2C trial's one conversion moment.
 *
 * Kept separate from the renewal sweep because it addresses a different person
 * about a different thing: the guardian, not the partner. Mixing them would put
 * a family's email behind a `partnerSubscription` lookup that has nothing to do
 * with them.
 */
export async function runTrialNotifications(
  appUrl: string,
  now = new Date(),
): Promise<NotificationRun> {
  const ending = await findEndingTrials(30, now)
  let sent = 0, skipped = 0, failed = 0

  for (const trial of ending) {
    const guardian = await prisma.appUser.findUnique({
      where:  { id: trial.appUserId },
      select: { email: true, firstName: true },
    })
    if (!guardian?.email) { skipped++; continue }

    const key = noticeKey('trial', trial.appUserId, trial.currentPeriodEnd.toISOString().slice(0, 10))
    if (!(await claim(key, 'notice:trial-ending'))) { skipped++; continue }

    try {
      await sendTrialEndingEmail({
        to:       guardian.email,
        name:     guardian.firstName,
        planName: 'Premium',
        endsAt:   trial.currentPeriodEnd,
        url:      `${appUrl}/subscriptions`,
      })
      sent++
    } catch (err) {
      console.error('[notifications] trial notice failed', { key, err })
      await release(key)
      failed++
    }
  }

  return { sent, skipped, failed }
}
