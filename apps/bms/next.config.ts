import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  transpilePackages: ["@genealogiq/auth", "@genealogiq/core", "@genealogiq/i18n", "@genealogiq/email", "@genealogiq/db", "@genealogiq/services", "@genealogiq/ui"],
  experimental: {
    authInterrupts: true,
  },
};

export default withNextIntl(nextConfig);
