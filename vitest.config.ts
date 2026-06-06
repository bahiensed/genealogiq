import { defineConfig } from "vitest/config"
import { fileURLToPath } from "node:url"

// NOTE: the three apps share the same "@/*" alias pointing at their own src.
// A single root config can only resolve one of them, so for now "@" → app/src
// (where the first action/IDOR tests live). When SEQ/BMS action tests are added,
// migrate to Vitest "projects" (one per app) so each gets its own alias.
const appSrc = fileURLToPath(new URL("./apps/app/src", import.meta.url))

export default defineConfig({
  resolve: {
    alias: { "@": appSrc },
  },
  test: {
    // Co-located unit tests live next to the source they cover.
    include: [
      "apps/**/src/**/*.{test,spec}.ts",
      "packages/**/src/**/*.{test,spec}.ts",
    ],
    environment: "node",
  },
})
