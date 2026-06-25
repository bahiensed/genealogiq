import { defineConfig, devices } from "@playwright/test"

// E2E smoke harness. Targets ONE app's dev server (BMS on :3000) and exercises
// only PUBLIC, read-only pages — no mutations — because the three apps share the
// production Neon DB. Authenticated / CRUD flows need a dedicated test database
// + seed (see e2e/README.md) before they can be added safely.
const PORT = 3000
const baseURL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm --filter @genealogiq/bms dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
