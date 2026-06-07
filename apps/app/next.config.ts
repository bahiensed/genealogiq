import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@genealogiq/auth", "@genealogiq/core", "@genealogiq/db", "@genealogiq/services"],
};

export default nextConfig;
