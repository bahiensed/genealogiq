import 'server-only'

import { prisma } from '@/lib/prisma'
import { verifySession } from '@/lib/dal'

export interface GenCodeSaleRow {
  saleId:      number
  tenantName:  string
  packageName: string
  saleDate:    Date
  total:       number
  activated:   number
  sold:        number
  available:   number
}

export async function getGenCodeSummary(): Promise<GenCodeSaleRow[]> {
  await verifySession()

  const rows = await prisma.$queryRaw<{
    sale_id:      number
    tenant_name:  string
    package_name: string
    sale_date:    Date
    total:        bigint
    activated:    bigint
    sold:         bigint
    available:    bigint
  }[]>`
    SELECT
      s.id                                                      AS sale_id,
      t.trade_name                                              AS tenant_name,
      p.name                                                    AS package_name,
      s.created_at                                              AS sale_date,
      COUNT(pql.id)                                             AS total,
      COUNT(CASE WHEN pql.status = 'ACTIVATED' THEN 1 END)     AS activated,
      COUNT(CASE WHEN pql.status = 'SOLD'      THEN 1 END)     AS sold,
      COUNT(CASE WHEN pql.status = 'AVAILABLE' THEN 1 END)     AS available
    FROM physical_qr_licenses pql
    JOIN sales     s ON pql.sale_id    = s.id
    JOIN packages  p ON pql.package_id = p.id
    JOIN tenants   t ON pql.tenant_id  = t.id
    GROUP BY s.id, t.trade_name, p.name, s.created_at
    ORDER BY s.created_at DESC
  `

  return rows.map((r) => ({
    saleId:      r.sale_id,
    tenantName:  r.tenant_name,
    packageName: r.package_name,
    saleDate:    r.sale_date,
    total:       Number(r.total),
    activated:   Number(r.activated),
    sold:        Number(r.sold),
    available:   Number(r.available),
  }))
}

export interface GenCodeTotals {
  total:     number
  activated: number
  // Written off by the tenant but not yet redeemed by the consumer. This is
  // the funnel's leak: every one of these is a buyer holding a code who never
  // came back. It was invisible here until now.
  sold:      number
  available: number
}

export async function getGenCodeTotals(): Promise<GenCodeTotals> {
  await verifySession()

  const result = await prisma.$queryRaw<{
    total:     bigint
    activated: bigint
    sold:      bigint
    available: bigint
  }[]>`
    SELECT
      COUNT(*)                                                  AS total,
      COUNT(CASE WHEN status = 'ACTIVATED' THEN 1 END)         AS activated,
      COUNT(CASE WHEN status = 'SOLD'      THEN 1 END)         AS sold,
      COUNT(CASE WHEN status = 'AVAILABLE' THEN 1 END)         AS available
    FROM physical_qr_licenses
  `

  const zero = BigInt(0)
  const row = result[0] ?? { total: zero, activated: zero, sold: zero, available: zero }
  return {
    total:     Number(row.total),
    activated: Number(row.activated),
    sold:      Number(row.sold),
    available: Number(row.available),
  }
}
