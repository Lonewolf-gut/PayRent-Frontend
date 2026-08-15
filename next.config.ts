import type { NextConfig } from "next";

const isProductionBuild = process.env.npm_lifecycle_event === "build";
const isWindowsDev = process.platform === "win32" && !isProductionBuild;
const turboFsCacheEnabled = process.env.TURBOPACK_FS_CACHE === "1";

const nextConfig: NextConfig = {
  distDir: isProductionBuild ? ".next" : ".next-dev",
  ...(isProductionBuild ? { output: "standalone" as const } : {}),
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      ...(process.env.S3_PUBLIC_URL
        ? [{ protocol: "https" as const, hostname: new URL(process.env.S3_PUBLIC_URL).hostname }]
        : []),
    ],
  },
  async redirects() {
    return [
      { source: "/dashboard/tenant/:path*", destination: "/dashboard/buyer/:path*", permanent: true },
      { source: "/dashboard/landlord/:path*", destination: "/dashboard/merchant/:path*", permanent: true },
      { source: "/dashboard/agent/:path*", destination: "/dashboard/marketer/:path*", permanent: true },
    ];
  },
  async rewrites() {
    const backendUrl = process.env.INTERNAL_API_URL?.replace(/\/$/, "");
    if (!backendUrl) return [];

    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
    optimizePackageImports: [
      "lucide-react",
      "framer-motion",
      "date-fns",
      "recharts",
      "@radix-ui/react-tooltip",
    ],
    // Next 16 enables Turbopack FS cache by default. On Windows it can mmap 200MB+ SST
    // files and crash with "paging file is too small" (os error 1455). Opt in with
    // TURBOPACK_FS_CACHE=1 if you have a large page file and want faster warm starts.
    ...(isWindowsDev && !turboFsCacheEnabled
      ? { turbopackFileSystemCacheForDev: false }
      : {}),
  },
};

export default nextConfig;
