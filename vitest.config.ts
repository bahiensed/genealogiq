import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    // Co-located unit tests live next to the source they cover.
    include: [
      "apps/**/src/**/*.{test,spec}.ts",
      "packages/**/src/**/*.{test,spec}.ts",
    ],
    environment: "node",
  },
})
