import { describe, it, expect, vi, beforeEach } from "vitest"

const { sendFeedbackMock } = vi.hoisted(() => ({ sendFeedbackMock: vi.fn() }))

vi.mock("next-intl/server", () => ({ getTranslations: vi.fn(async () => (key: string) => key) }))
vi.mock("@/lib/dal", () => ({ verifySession: vi.fn() }))
vi.mock("@/lib/email", () => ({ sendFeedback: sendFeedbackMock }))

import { sendFeedback } from "./feedback.actions"
import { verifySession } from "@/lib/dal"

const validInput = (overrides: Record<string, unknown> = {}) => ({
  type: "bug",
  message: "Something broke on the sales page.",
  ...overrides,
})

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(verifySession).mockResolvedValue({ user: { id: "u1", email: "staff@example.com" } } as never)
  sendFeedbackMock.mockResolvedValue(undefined)
})

describe("sendFeedback — input validation", () => {
  it("rejects an empty message before sending any email", async () => {
    const res = await sendFeedback(validInput({ message: "" }))

    expect(res).toEqual({ ok: false, message: "common.invalidData" })
    expect(sendFeedbackMock).not.toHaveBeenCalled()
  })

  it("rejects an invalid type before sending any email", async () => {
    const res = await sendFeedback(validInput({ type: "not-a-type" }))

    expect(res).toEqual({ ok: false, message: "common.invalidData" })
    expect(sendFeedbackMock).not.toHaveBeenCalled()
  })

  it("rejects a non-object payload", async () => {
    const res = await sendFeedback(null)

    expect(res).toEqual({ ok: false, message: "common.invalidData" })
    expect(sendFeedbackMock).not.toHaveBeenCalled()
  })
})

describe("sendFeedback — happy path", () => {
  it("requires a session before sending", async () => {
    await sendFeedback(validInput())

    expect(verifySession).toHaveBeenCalledTimes(1)
  })

  it("sends the email with the session's email as contactEmail, never from the payload", async () => {
    const res = await sendFeedback(validInput({ contactEmail: "attacker@evil.example.com" }))

    expect(res).toEqual({ ok: true, message: undefined })
    expect(sendFeedbackMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "bug",
        message: "Something broke on the sales page.",
        contactEmail: "staff@example.com",
      }),
    )
  })

  it("forwards the page path when provided", async () => {
    await sendFeedback(validInput({ page: "/sales/123" }))

    expect(sendFeedbackMock).toHaveBeenCalledWith(
      expect.objectContaining({ page: "/sales/123" }),
    )
  })
})
