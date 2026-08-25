import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

type Res = { body: unknown; status: number }

vi.mock("next/server", () => {
  class FakeNextResponse {
    body: unknown
    status: number
    constructor(body: unknown, init?: { status?: number }) {
      this.body = body
      this.status = init?.status ?? 200
    }
    static json(body: unknown, init?: { status?: number }) {
      return new FakeNextResponse(body, init)
    }
  }
  return { NextResponse: FakeNextResponse, NextRequest: class {} }
})

const { stripeMock, prismaMock, applyMock } = vi.hoisted(() => ({
  stripeMock: { webhooks: { constructEvent: vi.fn() } },
  prismaMock: { stripeEvent: { create: vi.fn() }, $transaction: vi.fn() },
  applyMock:  vi.fn(),
}))
vi.mock("@/lib/stripe", () => ({ stripe: stripeMock }))
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("@genealogiq/services/gencode-fulfilment", () => ({
  applyGenCodeSubscription: applyMock,
  CHECKOUT_ORIGINS: { bms: "bms", seq: "seq" },
}))

import { POST } from "./route"

const makeReq = (signature: string | null, body = "{}") =>
  ({
    headers: { get: (k: string) => (k === "stripe-signature" ? signature : null) },
    text: async () => body,
  }) as never

const event = (over: Record<string, unknown> = {}) => ({
  id: "evt_1",
  type: "customer.subscription.updated",
  data: { object: { id: "sub_1", metadata: { origin: "seq", saleId: "7" }, ...(over.object as object ?? {}) } },
  ...over,
})

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, "error").mockImplementation(() => {})
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test"
  stripeMock.webhooks.constructEvent.mockReturnValue(event())
  prismaMock.stripeEvent.create.mockResolvedValue({})
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prismaMock.$transaction.mockImplementation(async (cb: any) => cb(prismaMock))
  applyMock.mockResolvedValue(null)
})

afterEach(() => {
  delete process.env.STRIPE_WEBHOOK_SECRET
})

describe("POST /api/stripe/webhook (SEQ)", () => {
  it("returns 400 without a signature", async () => {
    expect(((await POST(makeReq(null))) as unknown as Res).status).toBe(400)
  })

  it("returns 400 when the signature does not verify", async () => {
    stripeMock.webhooks.constructEvent.mockImplementation(() => { throw new Error("bad sig") })
    expect(((await POST(makeReq("sig"))) as unknown as Res).status).toBe(400)
  })

  it("applies a subscription this app opened", async () => {
    const res = (await POST(makeReq("sig"))) as unknown as Res

    expect(res.status).toBe(200)
    expect(applyMock).toHaveBeenCalledWith(expect.objectContaining({ id: "sub_1" }), "seq")
  })

  // Stripe delivers every subscribed event to every endpoint on the account, so
  // this route also sees BMS's payment-link sales and the APP's consumer plans.
  // Acting on one would mint a batch twice.
  it("ignores a subscription another app opened", async () => {
    stripeMock.webhooks.constructEvent.mockReturnValue(
      event({ object: { id: "sub_1", metadata: { origin: "bms", saleId: "7" } } }),
    )

    const res = (await POST(makeReq("sig"))) as unknown as Res

    expect(res.body).toMatchObject({ ignored: "not a seq subscription" })
    expect(applyMock).not.toHaveBeenCalled()
  })

  it("ignores a subscription with no origin at all", async () => {
    stripeMock.webhooks.constructEvent.mockReturnValue(
      event({ object: { id: "sub_1", metadata: {} } }),
    )

    expect(applyMock).not.toHaveBeenCalled()
  })

  it("ignores event types it does not subscribe to", async () => {
    stripeMock.webhooks.constructEvent.mockReturnValue(event({ type: "checkout.session.completed" }))

    const res = (await POST(makeReq("sig"))) as unknown as Res

    expect(res.body).toEqual({ received: true })
    expect(applyMock).not.toHaveBeenCalled()
  })

  // Ledger and apply share one transaction: a duplicate delivery hits the PK,
  // and a failed apply rolls the ledger row back so Stripe's retry reprocesses.
  it("treats a duplicate delivery as such", async () => {
    prismaMock.$transaction.mockRejectedValue({ code: "P2002" })

    const res = (await POST(makeReq("sig"))) as unknown as Res

    expect(res.body).toMatchObject({ duplicate: true })
  })

  it("returns 500 when applying fails, so Stripe retries", async () => {
    prismaMock.$transaction.mockRejectedValue(new Error("db down"))

    const res = (await POST(makeReq("sig"))) as unknown as Res

    expect(res.status).toBe(500)
  })
})
