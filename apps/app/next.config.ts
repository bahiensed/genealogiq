import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { withSentryConfig } from "@sentry/nextjs";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  transpilePackages: ["@genealogiq/auth", "@genealogiq/core", "@genealogiq/i18n", "@genealogiq/email", "@genealogiq/db", "@genealogiq/services"],
  async headers() {
    return [
      {
        // The service worker script must never be served stale, or new
        // deploys' workers would be picked up late (or not at all).
        source: "/sw.js",
        headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }],
      },
    ];
  },
};

// Sentry wraps the inner (next-intl) config so both plugins compose.
// Source-map upload only runs when SENTRY_AUTH_TOKEN is present (CI / Vercel);
// it is a no-op locally, so dev builds don't need any Sentry secret.
export default withSentryConfig(withNextIntl(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  disableLogger: true,
});
