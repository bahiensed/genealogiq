import 'server-only'

import { prisma } from '@genealogiq/db'
import { stripe } from './stripe'

/**
 * Confronts what four systems believe about the same money.
 *
 * Stripe knows what it charged. `partner_subscriptions` knows who has a
 * contract. `subscription_cycles` knows what was granted. The ledger knows what
 * was spent. Each of those is written by a different path — a webhook, a
 * checkout, an activation, a cron — and every one of them can fail alone.
 *
 * This does not repair anything. It reports, and the distinction is deliberate:
 * a routine that silently corrects a discrepancy destroys the evidence of the
 * bug that caused it, and the bugs worth finding here are the ones that produce
 * a discrepancy in the first place.
 *
 * Each check exists because of a specific failure this system can actually have,
 * noted alongside it.
 */

export type Severity = 'critical' | 'warning'

export interface Finding {
  check:    string
  severity: Severity
  subject:  string
  detail:   string
}

export interface ReconciliationReport {
  ranAt:    Date
  checked:  { contracts: number; cycles: number; grants: number; genCodes: number }
  findings: Finding[]
}

export async function reconcile(now = new Date()): Promise<ReconciliationReport> {
  const findings: Finding[] = []

  const [contracts, cycles, grants, genCodes] = await Promise.all([
    prisma.partnerSubscription.count(),
    prisma.subscriptionCycle.count(),
    prisma.creditGrant.count(),
    prisma.genCode.count(),
  ])

  await Promise.all([
    checkLedgerAgainstCounters(findings),
    checkStockAgainstBalance(findings),
    checkActivationsHaveCredit(findings),
    checkCyclesAgainstStripe(findings),
    checkOrphanedContracts(findings, now),
    checkCommittedGrants(findings),
  ])

  return {
    ranAt: now,
    checked: { contracts, cycles, grants, genCodes },
    findings,
  }
}

/**
 * `remainingQty` is a materialised balance; the transactions are the truth.
 *
 * They drift if anything ever writes a grant without writing its transaction —
 * a code path that forgets, or a transaction that half-commits. When they
 * disagree, the counter is what is wrong.
 */
async function checkLedgerAgainstCounters(findings: Finding[]): Promise<void> {
  const rows = await prisma.$queryRaw<{
    id: string; remaining: number; derived: number
  }[]>`
    SELECT g.id,
           g.remaining_qty AS remaining,
           g.granted_qty
             - COALESCE(SUM(x.quantity) FILTER (WHERE x.type IN ('RESERVE','CONSUME','EXPIRE')), 0)
             + COALESCE(SUM(x.quantity) FILTER (WHERE x.type = 'RELEASE'), 0)
             AS derived
    FROM credit_grants g
    LEFT JOIN credit_transactions x ON x.grant_id = g.id AND x.type <> 'GRANT'
    GROUP BY g.id, g.remaining_qty, g.granted_qty
    HAVING g.remaining_qty <> g.granted_qty
      - COALESCE(SUM(x.quantity) FILTER (WHERE x.type IN ('RESERVE','CONSUME','EXPIRE')), 0)
      + COALESCE(SUM(x.quantity) FILTER (WHERE x.type = 'RELEASE'), 0)
  `

  for (const row of rows) {
    findings.push({
      check:    'ledger-vs-counter',
      severity: 'critical',
      subject:  `credit_grant ${row.id}`,
      detail:   `remaining_qty is ${row.remaining}; the ledger says ${row.derived}. The ledger is authoritative.`,
    })
  }
}

/**
 * The invariant the physical product rests on: a partner must never hold more
 * unactivated plaques than they have credits to activate them with.
 *
 * Breaking it means families receiving an object that fails at a graveside, so
 * this is the one check whose finding is worth acting on immediately.
 *
 * Committed credits count, because a committed plaque is exactly a code with a
 * credit reserved for it.
 */
async function checkStockAgainstBalance(findings: Finding[]): Promise<void> {
  const rows = await prisma.$queryRaw<{
    tenant_id: string; trade_name: string; stock: number; balance: number
  }[]>`
    SELECT t.id AS tenant_id,
           t.trade_name,
           (SELECT COUNT(*) FROM gencodes g
             WHERE g.tenant_id = t.id AND g.status IN ('AVAILABLE','SOLD'))          AS stock,
           (SELECT COALESCE(SUM(cg.remaining_qty), 0) FROM credit_grants cg
             WHERE cg.tenant_id = t.id AND cg.status = 'ACTIVE'
               AND (cg.expires_at IS NULL OR cg.expires_at > now()))                 AS balance
    FROM tenants t
  `

  for (const row of rows) {
    if (Number(row.stock) > Number(row.balance)) {
      findings.push({
        check:    'stock-exceeds-balance',
        severity: 'critical',
        subject:  row.trade_name,
        detail:   `${row.stock} unactivated codes against ${row.balance} credits — ${Number(row.stock) - Number(row.balance)} plaque(s) cannot be activated.`,
      })
    }
  }
}

/**
 * Every activation should point at the CONSUME that paid for it.
 *
 * A memorial with no credit transaction behind it is one the business gave away
 * without recording — the exact shape of the old model's revenue hole.
 */
async function checkActivationsHaveCredit(findings: Finding[]): Promise<void> {
  const orphans = await prisma.genCode.findMany({
    where:  { status: 'ACTIVATED', creditTransactionId: null },
    select: { genCode: true, tenantId: true, activatedAt: true },
    take:   50,
  })

  for (const o of orphans) {
    findings.push({
      check:    'activation-without-credit',
      severity: 'critical',
      subject:  o.genCode,
      detail:   `Activated ${o.activatedAt?.toISOString() ?? 'at an unknown time'} with no CONSUME recorded.`,
    })
  }
}

/**
 * Every cycle was opened by a paid invoice. Confirm Stripe still agrees.
 *
 * Catches the case a replayed or spoofed webhook would produce: a cycle — and
 * therefore an allowance — granted against an invoice that was never paid.
 */
async function checkCyclesAgainstStripe(findings: Finding[]): Promise<void> {
  const cycles = await prisma.subscriptionCycle.findMany({
    where:   { stripeInvoiceId: { not: null } },
    select:  { id: true, stripeInvoiceId: true },
    orderBy: { createdAt: 'desc' },
    // Bounded on purpose: this is the only check that costs an API call per
    // row, and a reconciliation that times out reports nothing at all.
    take:    100,
  })

  for (const cycle of cycles) {
    try {
      const invoice = await stripe.invoices.retrieve(cycle.stripeInvoiceId!)
      if (invoice.status !== 'paid') {
        findings.push({
          check:    'cycle-without-paid-invoice',
          severity: 'critical',
          subject:  `cycle ${cycle.id}`,
          detail:   `Invoice ${cycle.stripeInvoiceId} is "${invoice.status}", not paid.`,
        })
      }
    } catch {
      findings.push({
        check:    'cycle-without-paid-invoice',
        severity: 'warning',
        subject:  `cycle ${cycle.id}`,
        detail:   `Invoice ${cycle.stripeInvoiceId} could not be retrieved from Stripe.`,
      })
    }
  }

  if (cycles.length === 100) {
    // Never let a bounded check read as full coverage.
    findings.push({
      check:    'cycle-without-paid-invoice',
      severity: 'warning',
      subject:  'coverage',
      detail:   'Only the 100 most recent cycles were checked against Stripe.',
    })
  }
}

/**
 * Contracts stuck between states.
 *
 * A PENDING contract older than the checkout window is a session nobody paid —
 * harmless, but it should not accumulate. An ACTIVE contract with no cycle is
 * the serious one: it means a payment opened a contract and the cycle never got
 * written, so the partner is marked as paying and has no allowance.
 */
async function checkOrphanedContracts(findings: Finding[], now: Date): Promise<void> {
  const staleBefore = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)

  const [stalePending, activeWithoutCycle] = await Promise.all([
    prisma.partnerSubscription.findMany({
      where:  { status: 'PENDING', createdAt: { lt: staleBefore } },
      select: { id: true, createdAt: true },
      take:   50,
    }),
    prisma.partnerSubscription.findMany({
      where:  { status: 'ACTIVE', currentCycleId: null },
      select: { id: true },
      take:   50,
    }),
  ])

  for (const c of stalePending) {
    findings.push({
      check:    'stale-pending-contract',
      severity: 'warning',
      subject:  `contract ${c.id}`,
      detail:   `Still PENDING since ${c.createdAt.toISOString()} — the checkout session expired long ago.`,
    })
  }

  for (const c of activeWithoutCycle) {
    findings.push({
      check:    'active-contract-without-cycle',
      severity: 'critical',
      subject:  `contract ${c.id}`,
      detail:   'Marked ACTIVE with no current cycle — the partner has no allowance despite paying.',
    })
  }
}

/**
 * A committed grant belongs to exactly one code and one buyer.
 *
 * Losing that pairing breaks the promise the whole committed-reservation rule
 * exists to keep: that a family who already paid the funeral home can still
 * activate.
 */
async function checkCommittedGrants(findings: Finding[]): Promise<void> {
  const loose = await prisma.creditGrant.findMany({
    where:  { source: 'COMMITTED', genCodeId: null },
    select: { id: true },
    take:   50,
  })
  for (const g of loose) {
    findings.push({
      check:    'committed-grant-without-code',
      severity: 'critical',
      subject:  `credit_grant ${g.id}`,
      detail:   'COMMITTED but bound to no GenCode — the family it was reserved for cannot reach it.',
    })
  }

  const unbacked = await prisma.creditReservation.findMany({
    where:  { status: 'HELD', grant: { status: { not: 'ACTIVE' } } },
    select: { id: true, genCodeId: true },
    take:   50,
  })
  for (const r of unbacked) {
    findings.push({
      check:    'reservation-without-live-grant',
      severity: 'warning',
      subject:  `gencode ${r.genCodeId}`,
      detail:   'Reservation is HELD but its grant is no longer active — expected after a cycle expires, wrong otherwise.',
    })
  }
}
