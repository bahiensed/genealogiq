import { describe, it, expect, vi } from 'vitest'
vi.mock('server-only', () => ({}))
vi.mock('@vercel/blob', () => ({ list: vi.fn() }))
vi.mock('@genealogiq/db', () => ({ prisma: {} }))

import { monthlyStorageCostUsd, BLOB_USD_PER_GB_MONTH } from './storage-usage'

describe('monthlyStorageCostUsd', () => {
  it('prices a gigabyte at the published Blob rate', () => {
    expect(monthlyStorageCostUsd(1_000_000_000)).toBeCloseTo(BLOB_USD_PER_GB_MONTH, 6)
  })

  // The scenario the trial's economics were sized against: a heavy family at
  // roughly a gigabyte across a year of storage.
  it('keeps a heavy profile well under the unit revenue of an activation', () => {
    const yearly = monthlyStorageCostUsd(1_000_000_000) * 12
    expect(yearly).toBeLessThan(0.4)
  })

  it('is zero for an empty profile', () => {
    expect(monthlyStorageCostUsd(0)).toBe(0)
  })
})
