import { describe, it, expect, vi, beforeEach } from "vitest"

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: { tenant: { update: vi.fn() } },
}))

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
// Identity translator: getTranslations(ns) returns (key) => key, so an asserted
// localized message is exactly the i18n KEY the action passed.
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key }))
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("@/lib/dal", () => ({ verifyTenantSession: vi.fn() }))

import { updateCompany } from "./company.actions"
import { verifyTenantSession } from "@/lib/dal"
import { revalidatePath } from "next/cache"
import type { CompanyFormValues } from "@/schemas/company.schema"

const validInput: CompanyFormValues = {
  legalName: "Acme LTDA",
  tradeName: "Acme",
  taxId: "12345678000199",
  stateRegistration: null,
  municipalRegistration: null,
  email: "contact@acme.com",
  phoneCountryCode: "55",
  phone: "11999998888",
  isActive: true,
  address: {
    zip: "01310100",
    street: "Av Paulista",
    number: "1000",
    complement: null,
    neighborhood: "Bela Vista",
    city: "Sao Paulo",
    state: "SP",
    country: "BR",
  },
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(verifyTenantSession).mockResolvedValue({ customerId: "c1", user: { id: "u1" } } as never)
})

describe("updateCompany — ActionResult shape", () => {
  it("rejects invalid input with fail(common.invalidData) before touching the DB", async () => {
    const bad = { ...validInput, email: "not-an-email", legalName: "" }

    const res = await updateCompany("company-1", bad as CompanyFormValues)

    expect(res).toEqual({ ok: false, message: "common.invalidData" })
    expect(prismaMock.tenant.update).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it("rejects a missing required field (taxId) before touching the DB", async () => {
    const bad = { ...validInput, taxId: "" }

    const res = await updateCompany("company-1", bad as CompanyFormValues)

    expect(res).toEqual({ ok: false, message: "common.invalidData" })
    expect(prismaMock.tenant.update).not.toHaveBeenCalled()
  })

  it("returns done(company.updated) on the success path", async () => {
    prismaMock.tenant.update.mockResolvedValue({ id: "c1" })

    const res = await updateCompany("company-1", validInput)

    expect(res).toEqual({ ok: true, message: "company.updated" })
  })

  it("scopes the tenant update to the session customerId, not the passed id", async () => {
    prismaMock.tenant.update.mockResolvedValue({ id: "c1" })

    await updateCompany("ignored-arg-id", validInput)

    expect(prismaMock.tenant.update).toHaveBeenCalledTimes(1)
    expect(prismaMock.tenant.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "c1" },
        data: expect.objectContaining({
          name: "Acme LTDA",
          taxId: "12345678000199",
          email: "contact@acme.com",
        }),
      }),
    )
  })

  it("upserts the address when address data is present", async () => {
    prismaMock.tenant.update.mockResolvedValue({ id: "c1" })

    await updateCompany("company-1", validInput)

    const arg = prismaMock.tenant.update.mock.calls[0][0]
    expect(arg.data.address).toEqual({
      upsert: { create: expect.objectContaining({ city: "Sao Paulo" }), update: expect.any(Object) },
    })
  })

  it("omits the address write when address has no meaningful data", async () => {
    prismaMock.tenant.update.mockResolvedValue({ id: "c1" })
    const noAddress: CompanyFormValues = {
      ...validInput,
      address: {
        zip: null,
        street: null,
        number: null,
        complement: null,
        neighborhood: null,
        city: null,
        state: null,
        country: null,
      },
    }

    await updateCompany("company-1", noAddress)

    const arg = prismaMock.tenant.update.mock.calls[0][0]
    expect(arg.data.address).toBeUndefined()
  })

  it("revalidates the company page after a successful update", async () => {
    prismaMock.tenant.update.mockResolvedValue({ id: "c1" })

    await updateCompany("company-1", validInput)

    expect(revalidatePath).toHaveBeenCalledWith("/system/company")
  })
})
