/**
 * Next.js Configuration - Kapsamlı Optimizasyon
 */

const isProd = process.env.NODE_ENV === "production";

/ @type {import('next').NextConfig} */
const nextConfig = {
  // Core
  reactStrictMode: !isProd,
  generateEtags: true,
  cleanDistDir: true,

  // SWC Compiler
  compiler: {
    removeConsole: isProd ? { exclude: ["error", "warn"] } : false,
    reactRemoveProperties: isProd ? { properties: ["^data-testid$"] } : false,
  },

  // Experimental
  experimental: {
    // Package imports optimization
    optimizePackageImports: [
      "@heroui/react",
      "@heroui/system",
      "@heroui/theme",
      "framer-motion",
      "react-i18next",
      "i18next",
    ],
  },

  // Webpack
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      config.optimization = {
        ...config.optimization,
        concatenateModules: false,
        moduleIds: "named",
        chunkIds: "named",
      };
      config.devtool = "eval-cheap-module-source-map";
      config.watchOptions = {
        ...config.watchOptions,
        ignored: [
          "**/node_modules/**",
          "**/all-samples/**",
          "**/public/samples/**",
          "**/*.pdf",
          "**/*_by_PaddleOCR-VL.*",
        ],
      };
      config.stats = "errors-warnings";
    }

    if (isProd) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: "all",
          minSize: 20000,
          maxSize: 244000,
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: "vendor",
              chunks: "all",
              priority: 20,
            },
            heroui: {
              test: /[\\/]node_modules[\\/](@heroui|react-jsx)[\\/]/,
              name: "heroui",
              chunks: "all",
              priority: 30,
            },
            motion: {
              test: /[\\/]node_modules[\\/](framer-motion)[\\/]/,
              name: "motion",
              chunks: "async",
              priority: 25,
            },
            i18n: {
              test: /[\\/]node_modules[\\/](i18next|react-i18next)[\\/]/,
              name: "i18n",
              chunks: "async",
              priority: 25,
            },
          },
        },
        moduleIds: "deterministic",
        chunkIds: "deterministic",
      };
      config.devtool = "hidden-source-map";
    }

    if (isServer) {
      config.externals = [...(config.externals || []), "@heroui/react"];
    }

    return config;
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
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          {
            key: "Cache-Control",
            value: isProd 
              ? "public, max-age=31536000, immutable"
              : "no-cache, no-store, must-revalidate",
          },
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
      {
        source: "/_next/static/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
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
