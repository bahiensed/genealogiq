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

const { stripeMock, prismaMock, applyMock, unpayableMock } = vi.hoisted(() => ({
  stripeMock:    { webhooks: { constructEvent: vi.fn() } },
  prismaMock:    { stripeEvent: { findUnique: vi.fn(), create: vi.fn() } },
  applyMock:     vi.fn(),
  unpayableMock: vi.fn(),
}))
vi.mock("@/lib/stripe", () => ({ stripe: stripeMock }))
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("@/lib/billing", () => ({
  applySalePayment:  applyMock,
  markSaleUnpayable: unpayableMock,
  BMS_ORIGIN:        "bms",
}))

import { POST } from "./route"

const makeReq = (signature: string | null, body = "{}") =>
  ({
    headers: { get: (k: string) => (k === "stripe-signature" ? signature : null) },
    text: async () => body,
  }) as never

const bmsSession = {
  id: "cs_1",
  mode: "payment",
  payment_status: "paid",
  metadata: { origin: "bms", saleId: "7", tenantId: "t1", packageId: "p1", quantity: "2" },
}
const event = (over: Record<string, unknown> = {}) => ({
  id: "evt_1",
  type: "checkout.session.completed",
  data: { object: bmsSession },
  ...over,
})

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, "error").mockImplementation(() => {})
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test"
  stripeMock.webhooks.constructEvent.mockReturnValue(event())
  prismaMock.stripeEvent.findUnique.mockResolvedValue(null)
  prismaMock.stripeEvent.create.mockResolvedValue({})
  applyMock.mockResolvedValue(undefined)
  unpayableMock.mockResolvedValue(undefined)
})

afterEach(() => {
  delete process.env.STRIPE_WEBHOOK_SECRET
})

describe("POST /api/stripe/webhook (BMS)", () => {
  it("returns 400 without a signature", async () => {
    expect(((await POST(makeReq(null))) as unknown as Res).status).toBe(400)
  })

  it("returns 400 when the signature does not verify", async () => {
    stripeMock.webhooks.constructEvent.mockImplementation(() => { throw new Error("bad sig") })
    expect(((await POST(makeReq("sig"))) as unknown as Res).status).toBe(400)
  })

  // The mirror of SEQ's guard. Stripe fans every subscribed event out to EVERY
  // endpoint on the account, so this route also sees SEQ's and APP's sessions.
  it("ignores a session that is not ours", async () => {
    stripeMock.webhooks.constructEvent.mockReturnValue(
      event({ data: { object: { ...bmsSession, metadata: { tenantId: "t1" } } } }),
    )

    const res = (await POST(makeReq("sig"))) as unknown as Res

    expect(res.body).toMatchObject({ ignored: "not a bms session" })
    expect(applyMock).not.toHaveBeenCalled()
    expect(unpayableMock).not.toHaveBeenCalled()
  })

  // An async payment (boleto, Pix, ACH) completes checkout before it settles.
  it("waits for an unpaid session instead of fulfilling it", async () => {
    stripeMock.webhooks.constructEvent.mockReturnValue(
      event({ data: { object: { ...bmsSession, payment_status: "unpaid" } } }),
    )

    const res = (await POST(makeReq("sig"))) as unknown as Res

    expect(res.body).toMatchObject({ ignored: "unpaid" })
    expect(applyMock).not.toHaveBeenCalled()
  })

  it("fulfils a paid session, THEN records the event", async () => {
    const order: string[] = []
    applyMock.mockImplementation(async () => { order.push("apply") })
    prismaMock.stripeEvent.create.mockImplementation(async () => { order.push("record"); return {} })

    const res = (await POST(makeReq("sig"))) as unknown as Res

    expect(res.status).toBe(200)
    expect(order).toEqual(["apply", "record"])
  })

  it("treats an already-seen event as a duplicate without applying", async () => {
    prismaMock.stripeEvent.findUnique.mockResolvedValue({ id: "evt_1" })

    const res = (await POST(makeReq("sig"))) as unknown as Res

    expect(res.body).toMatchObject({ duplicate: true })
    expect(applyMock).not.toHaveBeenCalled()
  })

  it("returns 500 and records nothing when fulfilment fails", async () => {
    applyMock.mockRejectedValue(new Error("db down"))

    const res = (await POST(makeReq("sig"))) as unknown as Res

    expect(res.status).toBe(500)
    expect(prismaMock.stripeEvent.create).not.toHaveBeenCalled()
  })

  it("marks the sale expired when the session expires", async () => {
    stripeMock.webhooks.constructEvent.mockReturnValue(event({ type: "checkout.session.expired" }))

    const res = (await POST(makeReq("sig"))) as unknown as Res

    expect(res.status).toBe(200)
    expect(unpayableMock).toHaveBeenCalledWith("cs_1", "expired")
  })

  // SEQ omits this event because it creates nothing until the money lands. BMS
  // writes the sale when the link is generated, so without this a bounced boleto
  // strands it in "awaiting payment" forever — and the expiry event never comes,
  // because the session already completed.
  it("marks the sale failed when an async payment bounces", async () => {
    stripeMock.webhooks.constructEvent.mockReturnValue(
      event({ type: "checkout.session.async_payment_failed" }),
    )

    const res = (await POST(makeReq("sig"))) as unknown as Res

    expect(res.status).toBe(200)
    expect(unpayableMock).toHaveBeenCalledWith("cs_1", "failed")
    expect(applyMock).not.toHaveBeenCalled()
  })

  it("fulfils an async payment that succeeds", async () => {
    stripeMock.webhooks.constructEvent.mockReturnValue(
      event({ type: "checkout.session.async_payment_succeeded" }),
    )

    await POST(makeReq("sig"))

    expect(applyMock).toHaveBeenCalledTimes(1)
  })

  it("ignores event types it does not subscribe to", async () => {
    stripeMock.webhooks.constructEvent.mockReturnValue(event({ type: "customer.subscription.updated" }))

    const res = (await POST(makeReq("sig"))) as unknown as Res

    expect(res.body).toEqual({ received: true })
    expect(applyMock).not.toHaveBeenCalled()
  })
})
