import { defineConfig, devices } from "@playwright/test"
import { config as loadEnv } from "dotenv"

// Load .env.e2e (the Neon `development` branch + auth secret). These are forced
// onto the BMS dev server below so e2e runs against the dev branch, NEVER prod.
// Next.js's @next/env never overrides values already present in process.env, so
// passing them through `webServer.env` wins over apps/bms/.env.
const e2eEnv = loadEnv({ path: ".env.e2e" }).parsed ?? {}

const PORT = 3000
const baseURL = `http://localhost:${PORT}`
const STORAGE = "e2e/.auth/user.json"

export default defineConfig({
  testDir: "./e2e",
  // Serial: the authenticated CRUD specs share one dev server + the dev DB, so
  // parallel workers contend and make dropdown→navigate steps flaky.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    // Public, read-only pages — no auth needed.
    {
      name: "public",
      testMatch: /.*\.smoke\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    // Sign the seeded admin in once and persist the session.
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    // Authenticated CRUD — replays the stored session; runs after setup.
    {
      name: "authenticated",
      testMatch: /.*\.crud\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], storageState: STORAGE },
      dependencies: ["setup"],
    },
  ],
  webServer: {
    command: "pnpm --filter @genealogiq/bms dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // .env.e2e wins over the app's own .env (forces the dev DB + auth secret).
    env: { ...process.env, ...e2eEnv } as Record<string, string>,
  },
})
