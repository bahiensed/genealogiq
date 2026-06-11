import 'server-only'

import { prisma } from '@/lib/prisma'

export type StatementKind = 'CREDIT' | 'DEBIT'

export type StatementRow = {
  id:          string
  date:        Date
  description: string
  kind:        StatementKind
  /** +N for a purchase (credit), −1 for a sale to a consumer (debit), 0 if reversed. */
  units:       number
  /** Per-QR price of the transaction: purchase cost (credit) or sale value (debit). */
  unitPrice:   number | null
  /** Monetary total of the transaction (unitPrice × |units|). */
  totalPrice:  number | null
  reversed:    boolean
  /** Running balance after this line (oldest → newest). */
  balance:     number
}

export type DigitalQrStatement = {
  rows:        StatementRow[]
  liveBalance: number
  /** True when the reconstructed balance equals the live qrInventory.quantity. */
  reconciles:  boolean
}

/**
 * Builds a bank-statement-style ledger of a tenant's DIGITAL QR inventory.
 *
 * CREDITS = DIGITAL `Sale` rows (units = package.quantity × sale.quantity), added to
 * inventory by `applyCheckoutSession` (lib/billing.ts). Reversed sales were never
 * decremented from inventory, so they count as 0 units (shown struck-through) to keep
 * the running balance honest.
 *
 * DEBITS = `AppSale` rows, each consuming exactly 1 unit (actions/sale.actions.ts).
 *
 * Balance is computed forward from 0 (both tables are append-only) and compared to the
 * live `qrInventory.quantity` for reconciliation.
 */
export async function getDigitalQrStatement(tenantId: string): Promise<DigitalQrStatement> {
  const [sales, appSales, inventory] = await Promise.all([
    prisma.sale.findMany({
      where:  { tenantId, package: { type: 'DIGITAL' } },
      select: {
        id:         true,
        quantity:   true,
        createdAt:  true,
        reversedAt: true,
        package:    { select: { name: true, price: true, quantity: true } },
      },
    }),
    prisma.appSale.findMany({
      where:  { tenantId },
      select: {
        id:        true,
        createdAt: true,
        value:     true,
        appUser:   { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.qrInventory.findUnique({ where: { tenantId }, select: { quantity: true } }),
  ])

  type Pending = Omit<StatementRow, 'balance'>

  const credits: Pending[] = sales.map((s) => {
    const reversed   = s.reversedAt !== null
    const unitsAdded = s.package.quantity * s.quantity
    const unitPrice  = s.package.quantity > 0 ? Number(s.package.price) / s.package.quantity : null
    return {
      id:          `sale-${s.id}`,
      date:        s.createdAt,
      description: s.package.name,
      kind:        'CREDIT',
      units:       reversed ? 0 : unitsAdded,
      unitPrice,
      totalPrice:  reversed ? 0 : Number(s.package.price) * s.quantity,
      reversed,
    }
  })

  const debits: Pending[] = appSales.map((a) => {
    const value = a.value != null ? Number(a.value) : null
    return {
      id:          `appsale-${a.id}`,
      date:        a.createdAt,
      description: `Sale to ${`${a.appUser.firstName} ${a.appUser.lastName}`.trim()}`,
      kind:        'DEBIT',
      units:       -1,
      unitPrice:   value,
      totalPrice:  value,
      reversed:    false,
    }
  })

  const ascending = [...credits, ...debits].sort((a, b) => a.date.getTime() - b.date.getTime())

  let running = 0
  const rows: StatementRow[] = ascending.map((row) => {
    running += row.units
    return { ...row, balance: running }
  })

  const liveBalance = inventory?.quantity ?? 0

  // Newest first, bank-statement style.
  rows.reverse()

  return { rows, liveBalance, reconciles: running === liveBalance }
}
