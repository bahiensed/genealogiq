import * as Sentry from "@sentry/nextjs"

// Node runtime init. Imported by instrumentation.ts when NEXT_RUNTIME === "nodejs".
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  tracesSampleRate: 0,
})
