/**
 * Next.js Configuration - Kapsamlı Optimizasyon
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === "production";
const externalReferencePolicy = JSON.parse(
  fs.readFileSync(path.join(__dirname, "src/data/references/external-reference-policy.json"), "utf8"),
);

export function contentSecurityPolicy(nonce) {
  const effectiveNonce = nonce ?? "random-nonce-placeholder";
  const scriptSrc = isProd
    ? `'self' 'nonce-${effectiveNonce}'`
    : `'self' 'nonce-${effectiveNonce}' 'unsafe-eval'`;

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    `frame-src ${externalReferencePolicy.allowedFrameSources.join(" ")}`,
    "img-src 'self' data: blob: https:",
    "media-src 'self' blob:",
    "font-src 'self' data:",
    "connect-src 'self' https: ws: wss:",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "worker-src 'self' blob:",
  ].join("; ");
}

export function generateNonce() {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  let binary = "";
  for (const byte of array) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Core
  reactStrictMode: !isProd,
  generateEtags: true,
  cleanDistDir: true,
  outputFileTracingRoot: __dirname,
  allowedDevOrigins: ["127.0.0.1"],

  // Tek-node self-host icin yalin standalone cikti (ADR 0001; F9)
  output: "standalone",

  // SWC Compiler
  compiler: {
    removeConsole: isProd ? { exclude: ["error", "warn"] } : false,
    // `data-testid` PROD'DA SİYIRILMAZ (2026-08-08): release denetimleri
    // (audit:score-engine-focused-crops, audit:score-engine-engraving) prod
    // sunucuda (`next start`, 4015) bu seçicilerle çalışır. Sıyırma, prod-cycle
    // kapanış kapısını kendi denetlediği ortamda SESSİZCE kırıyordu — denetim
    // testid bulamayıp 15 s timeout alıyordu. Testid'ler release sözleşmesidir.
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

  // Verovio WASM is lazy-loaded via dynamic import; Node builtins inside its
  // Emscripten glue must not be bundled for the browser. Without this,
  // `next build --webpack` fails with UnhandledSchemeError: node:crypto / node:fs
  // (verovio/dist/verovio-module.mjs). Stub stays valid even when verovio is
  // not installed thanks to try/catch + optionalDependencies.
  webpack: (config, {isServer}) => {
    if (!isServer) {
      config.resolve = config.resolve || {};
      config.resolve.fallback = {
        ...(config.resolve.fallback ?? {}),
        fs: false,
        crypto: false,
        path: false,
        os: false,
        stream: false,
        buffer: false,
        module: false,
        util: false,
      };
      config.resolve.alias = {
        ...(config.resolve.alias ?? {}),
        "node:fs": false,
        "node:crypto": false,
        "node:module": false,
        "node:path": false,
        "node:os": false,
        "node:buffer": false,
        "node:stream": false,
        "node:util": false,
      };
    }
    return config;
  },

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
          { key: "Content-Security-Policy", value: contentSecurityPolicy() },
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
