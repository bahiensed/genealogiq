import * as Sentry from "@sentry/nextjs"

// Browser SDK init. Runs after the document loads, before React hydration.
// `enabled` is gated on the DSN so dev/CI (no DSN) is a true no-op.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  tracesSampleRate: 0,
})

// Required for App Router client navigation instrumentation.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
