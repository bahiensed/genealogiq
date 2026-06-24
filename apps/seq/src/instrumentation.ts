import * as Sentry from "@sentry/nextjs"

// Loads the runtime-specific Sentry init once per server instance.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config")
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config")
  }
}

// Captures errors thrown in Server Components, Route Handlers, Server Actions and
// the proxy (middleware) — the surfaces error.tsx cannot reach. No-op without a DSN.
export const onRequestError = Sentry.captureRequestError
