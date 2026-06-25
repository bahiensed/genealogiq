import * as Sentry from "@sentry/nextjs"

// Edge runtime init. Imported by instrumentation.ts when NEXT_RUNTIME === "edge".
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  tracesSampleRate: 0,
})
