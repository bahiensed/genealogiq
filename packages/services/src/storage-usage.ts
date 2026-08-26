import 'server-only'

import { list } from '@vercel/blob'
import { prisma } from '@genealogiq/db'

/**
 * How many BYTES a profile actually stores.
 *
 * Closes the debt the cost analysis surfaced: every quota in the system counts
 * FILES, and the bill counts bytes. `mediaMaxImages = 512` can mean 200 MB or
 * 5 GB depending on what people upload, so the limits do not measure the
 * quantity that generates cost.
 *
 * This does not enforce anything, deliberately. Nobody knows yet what the real
 * distribution looks like, and picking a `storageMaxBytes` before measuring
 * would be the same guess the file counts already are. Measure first; decide
 * with data.
 *
 * The app never sees an upload's size — uploads go client-direct to Blob — so
 * the numbers come from the store itself rather than from a column we would
 * have to backfill and keep in sync.
 */

export interface StorageUsage {
  profileId: string
  files:     number
  bytes:     number
}

/** Blob keys are prefixed per profile by the upload routes. */
function prefixFor(profileId: string): string {
  return `${profileId}/`
}

export async function getProfileStorageUsage(profileId: string): Promise<StorageUsage> {
  let files = 0
  let bytes = 0
  let cursor: string | undefined

  do {
    const page = await list({ prefix: prefixFor(profileId), cursor, limit: 1000 })
    for (const blob of page.blobs) {
      files += 1
      bytes += blob.size
    }
    cursor = page.hasMore ? page.cursor : undefined
  } while (cursor)

  return { profileId, files, bytes }
}

/**
 * Storage for every profile a guardian is responsible for.
 *
 * The guardian is the unit that matters commercially: the B2C trial is granted
 * to them and cascades to every memorial and pet they manage, so the cost of
 * one activation is the sum across all of those profiles, not one.
 */
export async function getGuardianStorageUsage(guardianId: string): Promise<{
  guardianId: string
  profiles:   StorageUsage[]
  totalBytes: number
}> {
  const managed = await prisma.appUser.findMany({
    where:  { guardedBy: { some: { guardianId, status: 'ACCEPTED' } } },
    select: { id: true },
  })

  const ids = [guardianId, ...managed.map((m) => m.id)]
  const profiles: StorageUsage[] = []
  for (const id of ids) {
    profiles.push(await getProfileStorageUsage(id))
  }

  return {
    guardianId,
    profiles,
    totalBytes: profiles.reduce((sum, p) => sum + p.bytes, 0),
  }
}

/** Bytes → GB-month cost at Vercel Blob's rate, for reasoning about a trial. */
export const BLOB_USD_PER_GB_MONTH = 0.023

export function monthlyStorageCostUsd(bytes: number): number {
  return (bytes / 1_000_000_000) * BLOB_USD_PER_GB_MONTH
}

/**
 * A sample of what activated memorials actually store.
 *
 * Sampled rather than exhaustive: this walks the Blob store per profile, and
 * doing that for every guardian on every run would turn a bookkeeping job into
 * a long one for a number nobody reads hourly. A sample is enough to answer the
 * question it exists for — is the trial's cost anywhere near the assumption it
 * was sized against.
 *
 * Measurement only. Nothing enforces a byte limit, and deliberately so: the
 * quotas count files, and picking a storageMaxBytes before knowing the real
 * distribution would be the same guess the file counts already are.
 */
export async function sampleStorageUsage(sampleSize = 25): Promise<{
  sampled:     number
  totalBytes:  number
  medianBytes: number
  p90Bytes:    number
  estimatedYearlyCostUsd: number
}> {
  const guardians = await prisma.appUserGuardian.findMany({
    where:   { status: 'ACCEPTED' },
    select:  { guardianId: true },
    distinct: ['guardianId'],
    take:     sampleSize,
  })

  const totals: number[] = []
  for (const g of guardians) {
    try {
      const usage = await getGuardianStorageUsage(g.guardianId)
      totals.push(usage.totalBytes)
    } catch {
      // A profile whose blobs cannot be listed is skipped rather than failing
      // the run — this is a metric, not a gate.
    }
  }

  if (totals.length === 0) {
    return { sampled: 0, totalBytes: 0, medianBytes: 0, p90Bytes: 0, estimatedYearlyCostUsd: 0 }
  }

  totals.sort((a, b) => a - b)
  const at = (q: number) => totals[Math.min(totals.length - 1, Math.floor(totals.length * q))]
  const totalBytes = totals.reduce((sum, b) => sum + b, 0)

  return {
    sampled:     totals.length,
    totalBytes,
    medianBytes: at(0.5),
    p90Bytes:    at(0.9),
    // What one guardian costs to store for a year — the figure the trial's
    // economics were sized against.
    estimatedYearlyCostUsd: Math.round(monthlyStorageCostUsd(at(0.5)) * 12 * 10000) / 10000,
  }
}
