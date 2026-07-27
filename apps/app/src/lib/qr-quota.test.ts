import { describe, it, expect, vi, beforeEach } from "vitest"

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    appUser: { findUnique: vi.fn(), findMany: vi.fn() },
  },
}))

vi.mock("server-only", () => ({}))
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("@/lib/subscription", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/subscription")>()
  return { ...actual, getMemorialFeatures: vi.fn() }
})

import { getQrQuotaStatus } from "./qr-quota"
import { getMemorialFeatures } from "@/lib/subscription"

const d = (iso: string) => new Date(iso)

// findUnique is called twice per getQrQuotaStatus call — once for the
// guardian (id/createdAt only) and once for the target profile
// (physicalQrLicense/appSale only). Keying by where.id lets each get its own
// shape instead of sharing a single mockResolvedValue.
function mockUsers(byId: Record<string, unknown>) {
  prismaMock.appUser.findUnique.mockImplementation(({ where }: { where: { id: string } }) =>
    Promise.resolve(byId[where.id] ?? null),
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getMemorialFeatures).mockResolvedValue({ qrCodeMax: 2 } as never)
})

describe("getQrQuotaStatus — rank heuristic", () => {
  it("unlocks the guardian's own profile when they have no memorials yet", async () => {
    mockUsers({ g1: { id: "g1", createdAt: d("2024-01-01") } })
    prismaMock.appUser.findMany.mockResolvedValue([])

    const status = await getQrQuotaStatus("g1", "g1")

    expect(status).toEqual({ unlocked: true, rank: 1, limit: 2 })
  })

  it("unlocks the two oldest profiles (own + memorials) and gates the rest", async () => {
    mockUsers({
      g1: { id: "g1", createdAt: d("2024-01-01") },
      m1: {},
      m2: {},
    })
    prismaMock.appUser.findMany.mockResolvedValue([
      { id: "m1", createdAt: d("2024-02-01") },
      { id: "m2", createdAt: d("2024-03-01") },
    ])

    // Own profile: oldest, rank 1, unlocked.
    expect(await getQrQuotaStatus("g1", "g1")).toEqual({ unlocked: true, rank: 1, limit: 2 })
    // m1: 2nd oldest, rank 2, unlocked (limit is 2).
    expect(await getQrQuotaStatus("g1", "m1")).toEqual({ unlocked: true, rank: 2, limit: 2 })
    // m2: 3rd oldest, rank 3, past the limit of 2, and no direct unlock of its own.
    expect(await getQrQuotaStatus("g1", "m2")).toEqual({ unlocked: false, rank: 3, limit: 2 })
  })

  it("ranks strictly by creation order regardless of query result order", async () => {
    mockUsers({
      g1: { id: "g1", createdAt: d("2024-06-01") },
      oldest: {},
      newest: {},
    })
    // Memorials returned out of chronological order.
    prismaMock.appUser.findMany.mockResolvedValue([
      { id: "newest", createdAt: d("2024-07-01") },
      { id: "oldest", createdAt: d("2024-01-01") },
    ])

    // "oldest" (Jan) should rank 1st, "g1" (Jun) 2nd, "newest" (Jul) 3rd.
    expect((await getQrQuotaStatus("g1", "oldest")).rank).toBe(1)
    expect((await getQrQuotaStatus("g1", "g1")).rank).toBe(2)
    expect((await getQrQuotaStatus("g1", "newest")).rank).toBe(3)
  })

  it("treats a profile not in the guardian's own set as past the end of the ranking", async () => {
    mockUsers({
      g1: { id: "g1", createdAt: d("2024-01-01") },
      m1: {},
      "someone-elses-profile": {},
    })
    // Already at the limit (2) with own profile + 1 memorial.
    prismaMock.appUser.findMany.mockResolvedValue([{ id: "m1", createdAt: d("2024-02-01") }])

    const status = await getQrQuotaStatus("g1", "someone-elses-profile")

    // Not found in the ranked set: falls back to rank = length + 1 (3rd),
    // past the qrCodeMax of 2.
    expect(status).toEqual({ unlocked: false, rank: 3, limit: 2 })
  })
})

describe("getQrQuotaStatus — direct-unlock bypass", () => {
  it("unlocks a memorial with its own physicalQrLicense regardless of rank", async () => {
    mockUsers({
      g1: { id: "g1", createdAt: d("2024-01-01") },
      m1: {}, m2: {}, m3: { physicalQrLicense: { id: "lic-1" } },
    })
    prismaMock.appUser.findMany.mockResolvedValue([
      { id: "m1", createdAt: d("2024-02-01") },
      { id: "m2", createdAt: d("2024-03-01") },
      { id: "m3", createdAt: d("2024-04-01") },
    ])

    // m3 is 4th oldest (rank 4), well past qrCodeMax=2 — but has its own
    // physical QR license, so it's unlocked on its own terms.
    const status = await getQrQuotaStatus("g1", "m3")

    expect(status).toEqual({ unlocked: true, rank: 4, limit: 2 })
  })

  it("unlocks a memorial with its own live directly-assigned AppSale (legacy bulk slot) regardless of rank", async () => {
    mockUsers({
      g1: { id: "g1", createdAt: d("2024-01-01") },
      m1: {}, m2: {},
      m3: { appSale: { status: "active", currentPeriodEnd: d("2999-01-01") } },
    })
    prismaMock.appUser.findMany.mockResolvedValue([
      { id: "m1", createdAt: d("2024-02-01") },
      { id: "m2", createdAt: d("2024-03-01") },
      { id: "m3", createdAt: d("2024-04-01") },
    ])

    const status = await getQrQuotaStatus("g1", "m3")

    expect(status).toEqual({ unlocked: true, rank: 4, limit: 2 })
  })

  it("does NOT bypass rank for a directly-assigned AppSale that's already expired", async () => {
    mockUsers({
      g1: { id: "g1", createdAt: d("2024-01-01") },
      m1: {}, m2: {},
      m3: { appSale: { status: "canceled", currentPeriodEnd: d("2020-01-01") } },
    })
    prismaMock.appUser.findMany.mockResolvedValue([
      { id: "m1", createdAt: d("2024-02-01") },
      { id: "m2", createdAt: d("2024-03-01") },
      { id: "m3", createdAt: d("2024-04-01") },
    ])

    const status = await getQrQuotaStatus("g1", "m3")

    expect(status).toEqual({ unlocked: false, rank: 4, limit: 2 })
  })
})
