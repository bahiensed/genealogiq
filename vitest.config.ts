import { defineConfig } from "vitest/config"

// Each app declares its own Vitest project (with its own "@/*" alias pointing at
// that app's src). This lets tests in app/seq/bms resolve "@/..." correctly even
// though all three share the same alias name. See apps/<app>/vitest.config.ts.
export default defineConfig({
  test: {
    projects: ["apps/app", "apps/seq", "apps/bms", "packages/core", "packages/auth"],
  },
})
