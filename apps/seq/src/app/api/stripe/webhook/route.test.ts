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
  prismaMock: { stripeEvent: { findUnique: vi.fn(), create: vi.fn() } },
  applyMock: vi.fn(),
}))
vi.mock("@/lib/stripe", () => ({ stripe: stripeMock }))
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("@/lib/billing", () => ({ applyCheckoutSession: applyMock }))

import { POST } from "./route"

const makeReq = (signature: string | null, body = "{}") =>
  ({
    headers: { get: (k: string) => (k === "stripe-signature" ? signature : null) },
    text: async () => body,
  }) as never

const paidSession = {
  id: "cs_1",
  mode: "payment",
  payment_status: "paid",
  metadata: { tenantId: "t1", packageId: "p1", quantity: "2", soldById: "u1" },
}
const event = (over: Record<string, unknown> = {}) => ({
  id: "evt_1",
  type: "checkout.session.completed",
  data: { object: paidSession },
  ...over,
})

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, "error").mockImplementation(() => {})
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test"
  stripeMock.webhooks.constructEvent.mockReturnValue(event())
  prismaMock.stripeEvent.findUnique.mockResolvedValue(null) // not seen by default
  prismaMock.stripeEvent.create.mockResolvedValue({})
  applyMock.mockResolvedValue(undefined)
})

afterEach(() => {
  delete process.env.STRIPE_WEBHOOK_SECRET
})

describe("POST /api/stripe/webhook (SEQ)", () => {
  it("returns 400 without a signature", async () => {
    const res = (await POST(makeReq(null))) as unknown as Res
    expect(res.status).toBe(400)
  })

  // Stripe fans every subscribed event out to EVERY endpoint on the account, so
  // this route sees the sessions BMS opens for its payment links. Letting one
  // through is not a harmless duplicate: BMS pre-creates the Sale carrying the
  // session id, so applyCheckoutSession would hit the stripeSessionId unique,
  // read it as "already processed" and mint nothing at all.
  it("ignores a session BMS owns, before touching fulfilment", async () => {
    stripeMock.webhooks.constructEvent.mockReturnValue(
      event({
        data: {
          object: {
            ...paidSession,
            metadata: { ...paidSession.metadata, origin: "bms", saleId: "7" },
          },
        },
      }),
    )

    const res = (await POST(makeReq("sig"))) as unknown as Res

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ ignored: "bms-owned session" })
    expect(applyMock).not.toHaveBeenCalled()
    expect(prismaMock.stripeEvent.create).not.toHaveBeenCalled()
  })

  it("still fulfils a session with no origin (SEQ's own self-serve checkout)", async () => {
    const res = (await POST(makeReq("sig"))) as unknown as Res

    expect(res.status).toBe(200)
    expect(applyMock).toHaveBeenCalledTimes(1)
  })

  it("ignores irrelevant event types", async () => {
    stripeMock.webhooks.constructEvent.mockReturnValue(event({ type: "customer.subscription.updated" }))
    const res = (await POST(makeReq("sig"))) as unknown as Res
    expect(res.body).toEqual({ received: true })
    expect(applyMock).not.toHaveBeenCalled()
  })

  it("ignores unpaid checkout sessions", async () => {
    stripeMock.webhooks.constructEvent.mockReturnValue(
      event({ data: { object: { ...paidSession, payment_status: "unpaid" } } }),
    )
    const res = (await POST(makeReq("sig"))) as unknown as Res
    expect(res.body).toMatchObject({ ignored: "unpaid" })
    expect(applyMock).not.toHaveBeenCalled()
  })

  it("ignores sessions with missing/invalid metadata", async () => {
    stripeMock.webhooks.constructEvent.mockReturnValue(
      event({ data: { object: { ...paidSession, metadata: { tenantId: "t1" } } } }),
    )
    const res = (await POST(makeReq("sig"))) as unknown as Res
    expect(res.body).toMatchObject({ ignored: "bad metadata" })
    expect(applyMock).not.toHaveBeenCalled()
  })

  // Fast-path idempotency: an already-recorded event must NOT be reprocessed.
  it("treats an already-seen event as a duplicate without applying", async () => {
    prismaMock.stripeEvent.findUnique.mockResolvedValue({ id: "evt_1" })
    const res = (await POST(makeReq("sig"))) as unknown as Res
    expect(res.body).toEqual({ received: true, duplicate: true })
    expect(applyMock).not.toHaveBeenCalled()
  })

  // P1-14 reorder: process FIRST, then record the event (so a failed apply leaves
  // no StripeEvent row and Stripe's retry can reprocess).
  it("applies the checkout, THEN records the event", async () => {
    const calls: string[] = []
    applyMock.mockImplementation(async () => { calls.push("apply") })
    prismaMock.stripeEvent.create.mockImplementation(async () => { calls.push("create"); return {} })

    const res = (await POST(makeReq("sig"))) as unknown as Res

    expect(res.body).toEqual({ received: true })
    expect(calls).toEqual(["apply", "create"])
  })

  it("returns 500 (and records nothing) when applyCheckoutSession fails", async () => {
    applyMock.mockRejectedValue(new Error("db down"))
    const res = (await POST(makeReq("sig"))) as unknown as Res
    expect(res.status).toBe(500)
    expect(prismaMock.stripeEvent.create).not.toHaveBeenCalled()
  })
})
