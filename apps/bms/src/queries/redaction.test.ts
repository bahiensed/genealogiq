import { describe, it, expect, vi, beforeEach } from "vitest"

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    tenant:   { findUnique: vi.fn() },
    user:     { findUnique: vi.fn() },
  },
}))

vi.mock("server-only", () => ({}))
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("@/lib/dal", () => ({
  verifySession:    vi.fn(),
  canViewSensitive: vi.fn(),
  REDACTED:         "•••",
}))

import { getCustomer } from "@/queries/customers"
import { getUser } from "@/queries/users"
import { canViewSensitive } from "@/lib/dal"

const customerRow = {
  id: "t1", entityType: "COMPANY", name: "Funerária X", tradeName: "X",
  taxId: "11222333000181", stateRegistration: "SR-1", municipalRegistration: "MR-1",
  birthDate: null, email: "x@y.com", phoneCountryCode: "55", phone: "11999998888",
  notes: "internal note", isActive: true,
  address: { zip: "12345-678", street: "Rua A" },
}

const userRow = {
  id: "u1", firstName: "Ana", lastName: "Silva", email: "ana@y.com", role: "ADMIN",
  nationalId: "52998224725", birthDate: null, phoneCountryCode: "55", phone: "11999998888",
  isActive: true, address: { zip: "12345-678" },
}

beforeEach(() => vi.clearAllMocks())

describe("getCustomer redaction", () => {
  it("returns raw data for a privileged viewer", async () => {
    vi.mocked(canViewSensitive).mockResolvedValue(true)
    prismaMock.tenant.findUnique.mockResolvedValue(customerRow)
    const res = await getCustomer("t1")
    expect(res?.taxId).toBe("11222333000181")
    expect(res?.address).not.toBeNull()
  })

  it("redacts third-party PII for a non-privileged viewer (identity fields preserved)", async () => {
    vi.mocked(canViewSensitive).mockResolvedValue(false)
    prismaMock.tenant.findUnique.mockResolvedValue(customerRow)
    const res = await getCustomer("t1")
    expect(res).toMatchObject({
      id: "t1", name: "Funerária X", email: "x@y.com", isActive: true,
      taxId: "•••", phone: "•••", notes: "•••", stateRegistration: "•••", municipalRegistration: "•••",
      address: null,
    })
  })

  it("returns null for a missing row, even when non-privileged", async () => {
    vi.mocked(canViewSensitive).mockResolvedValue(false)
    prismaMock.tenant.findUnique.mockResolvedValue(null)
    expect(await getCustomer("missing")).toBeNull()
  })
})

describe("getUser redaction", () => {
  it("returns raw data for a privileged viewer", async () => {
    vi.mocked(canViewSensitive).mockResolvedValue(true)
    prismaMock.user.findUnique.mockResolvedValue(userRow)
    const res = await getUser("u1")
    expect(res?.nationalId).toBe("52998224725")
    expect(res?.address).not.toBeNull()
  })

  it("redacts nationalId/phone/address for a non-privileged viewer (role preserved)", async () => {
    vi.mocked(canViewSensitive).mockResolvedValue(false)
    prismaMock.user.findUnique.mockResolvedValue(userRow)
    const res = await getUser("u1")
    expect(res).toMatchObject({
      id: "u1", firstName: "Ana", email: "ana@y.com", role: "ADMIN",
      nationalId: "•••", phone: "•••", address: null,
    })
  })
})
