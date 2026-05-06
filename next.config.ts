import type { NextConfig } from "next";

// next-pwa v5 uses CommonJS
// eslint-disable-next-line @typescript-eslint/no-require-imports
const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  // Disable SW in development to avoid caching issues
  disable: process.env.NODE_ENV === "development",
  // Custom worker code (push notifications, background sync)
  customWorkerDir: "worker",
  runtimeCaching: [
    // App shell — cache-first
    {
      urlPattern: /^https?.*/,
      handler: "NetworkFirst",
      options: {
        cacheName: "kaizen-app",
        expiration: { maxEntries: 200, maxAgeSeconds: 86400 },
        networkTimeoutSeconds: 10,
      },
    },
  ],
  buildExcludes: [/middleware-manifest\.json$/],
});

const nextConfig: NextConfig = {
  // Silence Turbopack warning from next-pwa's webpack config
  // (PWA service worker is disabled in dev anyway)
  turbopack: {},
};

export default withPWA(nextConfig);
