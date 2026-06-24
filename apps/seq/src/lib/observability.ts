import * as Sentry from "@sentry/nextjs"

/**
 * Single place runtime errors are recorded.
 *
 * - Always logs the error with its `digest` (the same id Next.js writes to the
 *   server logs and that `error.tsx` receives), so a report is traceable.
 * - Forwards to Sentry only when a DSN is configured; without one it is a no-op
 *   (local dev / CI), so the App Router boundary files stay decoupled from the
 *   observability provider and work whether or not Sentry is wired.
 */
export function captureBoundaryError(error: Error & { digest?: string }): void {
  console.error("[boundary]", error.digest ?? "no-digest", error)
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.captureException(error)
  }
}
