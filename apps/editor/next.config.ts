import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  transpilePackages: ['@packages/core', '@packages/types'],
};

export default nextConfig;
