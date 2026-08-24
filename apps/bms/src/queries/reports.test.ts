import { describe, it, expect, vi } from "vitest"

// reports.ts is server-only and pulls in prisma/dal at import time. foldChannels
// itself is pure — these stubs just let the module load.
vi.mock("server-only", () => ({}))
vi.mock("@/lib/prisma", () => ({ prisma: {} }))
vi.mock("@/lib/dal", () => ({ verifySession: vi.fn() }))

import { foldChannels } from "./reports"

describe("foldChannels", () => {
  it("always reports both channels, even with no sales at all", () => {
    expect(foldChannels([])).toEqual([
      { channel: "MANUAL", count: 0, value: 0 },
      { channel: "PLATFORM", count: 0, value: 0 },
    ])
  })

  // Codes written off before soldVia existed carry null. Dropping them would
  // understate the manual channel by exactly the oldest, least visible rows.
  it("folds legacy null sold_via into the manual channel rather than dropping it", () => {
    const out = foldChannels([
      { channel: null, count: 2, value: 450 },
      { channel: "MANUAL", count: 1, value: 100 },
      { channel: "PLATFORM", count: 3, value: 300 },
    ])

    expect(out).toEqual([
      { channel: "MANUAL", count: 3, value: 550 },
      { channel: "PLATFORM", count: 3, value: 300 },
    ])
  })

  it("treats an unrecognised channel as manual instead of losing the row", () => {
    const out = foldChannels([{ channel: "SOMETHING_NEW", count: 5, value: 50 }])

    expect(out.find((c) => c.channel === "MANUAL")).toEqual({ channel: "MANUAL", count: 5, value: 50 })
  })
})
