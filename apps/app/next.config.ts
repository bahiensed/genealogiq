import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@genealogiq/core", "@genealogiq/db", "@genealogiq/services"],
};

export default nextConfig;
