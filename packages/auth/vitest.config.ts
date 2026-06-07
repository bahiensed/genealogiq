import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    name: "auth",
    include: ["src/**/*.{test,spec}.ts"],
    environment: "node",
  },
})
