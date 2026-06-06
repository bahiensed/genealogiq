import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@genealogiq/core", "@genealogiq/ui"],
  experimental: {
    authInterrupts: true,
  },
};

export default nextConfig;
