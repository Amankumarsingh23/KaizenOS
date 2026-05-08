import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PWA disabled — was causing stale-cache issues on redeployment
  // Re-enable by wrapping with next-pwa when stable
};

export default nextConfig;
