import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@genealogiq/core", "@genealogiq/db"],
};

export default nextConfig;
