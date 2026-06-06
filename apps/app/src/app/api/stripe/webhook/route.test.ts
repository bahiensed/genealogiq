import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// Shape we assert against (mirrors the FakeNextResponse defined in the mock).
type Res = { body: unknown; status: number }

// Minimal NextResponse stand-in: supports `new NextResponse(body, init)` and
// `NextResponse.json(body, init)`. Defined INSIDE the factory because vi.mock is
// hoisted above the file's top-level declarations.
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

const { stripeMock, prismaMock, upsertMock } = vi.hoisted(() => ({
  stripeMock: { webhooks: { constructEvent: vi.fn() } },
  prismaMock: { $transaction: vi.fn() },
  upsertMock: vi.fn(),
}))
vi.mock("@/lib/stripe", () => ({ stripe: stripeMock }))
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("@/lib/billing", () => ({ upsertSaleFromSubscription: upsertMock }))

import { POST } from "./route"

// Build a fake NextRequest with the bits the handler reads.
const makeReq = (signature: string | null, body = "{}") =>
  ({
    headers: { get: (k: string) => (k === "stripe-signature" ? signature : null) },
    text: async () => body,
  }) as never

const SUB_EVENT = {
  id: "evt_1",
  type: "customer.subscription.updated",
  data: { object: { id: "sub_1" } },
}

beforeEach(() => {
  vi.clearAllMocks()
  // The handler logs expected failures via console.error — silence them so the
  // test output stays clean (the 500 case deliberately throws).
  vi.spyOn(console, "error").mockImplementation(() => {})
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test"
  stripeMock.webhooks.constructEvent.mockReturnValue(SUB_EVENT)
})

afterEach(() => {
  delete process.env.STRIPE_WEBHOOK_SECRET
})

describe("POST /api/stripe/webhook", () => {
  it("returns 400 when the stripe-signature header is missing", async () => {
    const res = (await POST(makeReq(null))) as unknown as Res
    expect(res.status).toBe(400)
    expect(prismaMock.$transaction).not.toHaveBeenCalled()
  })

  it("ignores events outside the relevant set without touching the DB", async () => {
    stripeMock.webhooks.constructEvent.mockReturnValue({
      id: "evt_2",
      type: "invoice.paid",
      data: { object: {} },
    })
    const res = (await POST(makeReq("sig"))) as unknown as Res
    expect(res.body).toEqual({ received: true })
    expect(prismaMock.$transaction).not.toHaveBeenCalled()
  })

  // P1-14 atomicity: the StripeEvent insert and the sale upsert must run inside
  // the SAME transaction so a failed upsert rolls the event back.
  it("records the event and upserts the sale inside one transaction", async () => {
    const txMock = { stripeEvent: { create: vi.fn() } }
    prismaMock.$transaction.mockImplementation(async (cb: (tx: typeof txMock) => unknown) => cb(txMock))

    const res = (await POST(makeReq("sig"))) as unknown as Res

    expect(res.body).toEqual({ received: true })
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1)
    expect(txMock.stripeEvent.create).toHaveBeenCalledWith({
      data: { id: "evt_1", type: "customer.subscription.updated" },
    })
    expect(upsertMock).toHaveBeenCalledWith(txMock, SUB_EVENT.data.object)
  })

  // P1-14 idempotency: a duplicate delivery (unique-violation on the StripeEvent
  // PK) is swallowed and answered 200 so Stripe stops retrying.
  it("treats a duplicate delivery (P2002) as already-received, not an error", async () => {
    prismaMock.$transaction.mockRejectedValue({ code: "P2002" })

    const res = (await POST(makeReq("sig"))) as unknown as Res

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ received: true, duplicate: true })
  })

  it("returns 500 on a non-idempotency processing failure", async () => {
    prismaMock.$transaction.mockRejectedValue(new Error("db down"))

    const res = (await POST(makeReq("sig"))) as unknown as Res

    expect(res.status).toBe(500)
    expect(res.body).toEqual({ error: "internal" })
  })
})
