/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, {dev}) => {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: [
          "**/all-samples/**",
          "**/public/samples/**",
          "**/*.pdf",
          "**/*_by_PaddleOCR-VL.*",
        ],
      };
    }

    return config;
  },
};

export default nextConfig;
