import 'server-only'

import type { Prisma } from '@genealogiq/db'

/**
 * How many unused credits survive a renewal.
 *
 * Rollover exists for retention, not accumulation: it protects the partner who
 * renews without letting anyone bank an unbounded stock of activation rights.
 * Three rules do that, and each has a specific failure it prevents.
 *
 * The cap is a share of the RENEWED plan's allowance, so downgrading shrinks
 * what carries over rather than letting a partner ride a big plan's leftovers on
 * a small plan's price.
 *
 * Rolled credits get their own, shorter validity, dated from the new cycle.
 *
 * A credit that already rolled can never roll again. Without that, the same
 * unit rolls every year and the "six month" validity means nothing.
 */

export interface RolloverInput {
  /** Unused credits, from grants eligible to roll (generation 0). */
  unused:          number
  /** The allowance of the plan being renewed INTO. */
  renewedAllowance: number
  rolloverRate:    number
  /** The launch guarantee: 100% once, instead of the cap. */
  founderEligible: boolean
  founderUsed:     boolean
}

export interface RolloverDecision {
  quantity:      number
  /** True when this consumed the one-time founder guarantee. */
  usedFounder:   boolean
  /** 'cycle-end' for the founder grant, 'months' for the standard one. */
  validity:      'cycle-end' | 'months'
}

export function decideRollover(input: RolloverInput): RolloverDecision {
  if (input.unused <= 0) {
    return { quantity: 0, usedFounder: false, validity: 'months' }
  }

  if (input.founderEligible && !input.founderUsed) {
    // Everything carries, once, and lives to the end of the second cycle —
    // the adoption guarantee, not a permanent term.
    return { quantity: input.unused, usedFounder: true, validity: 'cycle-end' }
  }

  const cap = Math.floor(input.renewedAllowance * input.rolloverRate)
  return { quantity: Math.min(input.unused, cap), usedFounder: false, validity: 'months' }
}

/**
 * The credits a renewal may carry over.
 *
 * Only generation 0 counts: a grant that is itself the product of a rollover is
 * excluded, which is what stops a unit living forever by rolling every year.
 * COMMITTED grants are excluded too — they belong to a family, not to the
 * partner's pool, and they already outlive the cycle on their own terms.
 */
export async function countRollableCredits(
  tx:       Prisma.TransactionClient,
  tenantId: string,
  cycleId:  string,
): Promise<number> {
  const grants = await tx.creditGrant.findMany({
    where: {
      tenantId,
      cycleId,
      status:             'ACTIVE',
      remainingQty:       { gt: 0 },
      rolloverGeneration: 0,
      source:             { notIn: ['COMMITTED'] },
    },
    select: { remainingQty: true },
  })
  return grants.reduce((sum, g) => sum + g.remainingQty, 0)
}
