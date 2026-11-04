import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  serverExternalPackages: ["@cloudflare/playwright"],
  allowedDevOrigins: ["192.168.1.173"],
};

export default nextConfig;