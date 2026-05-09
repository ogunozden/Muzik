/**
 * Next.js Configuration - Kapsamlı Optimizasyon
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === "production";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Core
  reactStrictMode: !isProd,
  generateEtags: true,
  cleanDistDir: true,
  outputFileTracingRoot: __dirname,

  // SWC Compiler
  compiler: {
    removeConsole: isProd ? { exclude: ["error", "warn"] } : false,
    reactRemoveProperties: isProd ? { properties: ["^data-testid$"] } : false,
  },

  // Images
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 128, 256],
    minimumCacheTTL: 31536000,
  },

  // Server external
  serverExternalPackages: [],

  // Headers
  async headers() {
    const headers = [
      {
        source: "/:path*",
        headers: [
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(self), geolocation=()",
          },
        ],
      },
      {
        source: "/samples/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];

    if (isProd) {
      headers.push({
        source: "/_next/static/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      });
    }

    return headers;
  },

  // Trailing slash
  trailingSlash: false,

  // Powered by header
  poweredByHeader: false,

  // OnDemand entries
  onDemandEntries: {
    maxInactiveAge: 5 * 60 * 1000,
    pagesBufferLength: 5,
  },
};

export default nextConfig;
