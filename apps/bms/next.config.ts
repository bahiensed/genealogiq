import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@genealogiq/core"],
  experimental: {
    authInterrupts: true,
  },
};

export default nextConfig;
