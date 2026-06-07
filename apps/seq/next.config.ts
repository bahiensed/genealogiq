import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@genealogiq/core", "@genealogiq/db", "@genealogiq/services", "@genealogiq/ui"],
  experimental: {
    authInterrupts: true,
  },
};

export default nextConfig;
