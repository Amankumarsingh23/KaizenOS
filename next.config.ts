import type { NextConfig } from "next";

// next-pwa v5 uses CommonJS
// eslint-disable-next-line @typescript-eslint/no-require-imports
const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  customWorkerDir: "worker",
  runtimeCaching: [
    // ── Never cache API routes or auth endpoints ──────────────────────────────
    {
      urlPattern: /\/api\//,
      handler: "NetworkOnly",
    },
    // ── Next.js JS/CSS chunks — cache-first (content-hashed, safe forever) ───
    {
      urlPattern: /\/_next\/static\//,
      handler: "CacheFirst",
      options: {
        cacheName: "next-static",
        expiration: { maxEntries: 200, maxAgeSeconds: 365 * 24 * 60 * 60 },
      },
    },
    // ── Images ───────────────────────────────────────────────────────────────
    {
      urlPattern: /\/_next\/image/,
      handler: "CacheFirst",
      options: {
        cacheName: "next-images",
        expiration: { maxEntries: 60, maxAgeSeconds: 7 * 24 * 60 * 60 },
      },
    },
    // ── App pages — network first, 3 s timeout, short cache ──────────────────
    {
      urlPattern: /^https:\/\/.+\//,
      handler: "NetworkFirst",
      options: {
        cacheName: "kaizen-pages",
        expiration: { maxEntries: 30, maxAgeSeconds: 24 * 60 * 60 },
        networkTimeoutSeconds: 3,
      },
    },
  ],
  buildExcludes: [/middleware-manifest\.json$/],
});

const nextConfig: NextConfig = {
  turbopack: {},
};

export default withPWA(nextConfig);
